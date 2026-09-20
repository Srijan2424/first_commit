import { randomUUID } from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Files } from "./engine";
import type { Prescription } from "../../../shared/domain";
import { assert } from "./policy";
const s3 = new S3Client({});
const bucket = () => process.env.FILES_BUCKET!;
export function validateBytes(bytes: Uint8Array, type: string, size: number) {
  assert(
    bytes.length === size && size > 0 && size <= 10 * 1024 * 1024,
    "File size does not match the upload",
  );
  const b = Buffer.from(bytes);
  const valid =
    type === "image/jpeg"
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : type === "image/png"
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === "application/pdf"
          ? b.subarray(0, 5).toString() === "%PDF-"
          : false;
  assert(valid, "File content does not match its declared type");
}
export async function renderPrescription(rx: Prescription) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  function line(text: string, size = 11, strong = false) {
    // Never silently replace names or instructions. Unsupported glyphs fail clearly;
    // the HTML print view retains Unicode while multilingual PDF fonts are pending.
    const selected = strong ? bold : font;
    let row = "";
    const max = 490;
    for (const word of text.split(/\s+/)) {
      const next = row ? `${row} ${word}` : word;
      let width: number;
      try {
        width = selected.widthOfTextAtSize(next, size);
      } catch {
        throw new Error(
          "PDF font does not support this text. Use the browser Print / Save as PDF option for this prescription.",
        );
      }
      if (width > max && row) {
        draw(row);
        row = word;
      } else row = next;
    }
    draw(row);
    function draw(value: string) {
      if (y < 65) {
        page = pdf.addPage([595.28, 841.89]);
        y = 785;
      }
      page.drawText(value, {
        x: 50,
        y,
        size,
        font: selected,
        color: rgb(0.05, 0.12, 0.18),
      });
      y -= size + 7;
    }
  }
  line("MedPal", 28, true);
  line("Care, in context.");
  line(rx.doctor.clinicName ?? "", 14, true);
  line(rx.doctor.clinicAddress ?? "");
  y -= 10;
  line(rx.doctor.fullName, 14, true);
  line(`${rx.doctor.qualifications ?? ""} | ${rx.doctor.medicalCouncil ?? ""}`);
  line(`Registration: ${rx.doctor.registrationNumber ?? ""}`);
  y -= 10;
  line(`Patient: ${rx.patient.fullName}`, 13, true);
  line(`Date of birth: ${rx.patient.dateOfBirth ?? ""}`);
  line(`Issued: ${rx.issuedAt}`);
  line(`Record: ${rx.id}`);
  y -= 10;
  for (const [label, value] of [
    ["Concern", rx.draft.complaint],
    ["Observations", rx.draft.observations],
    ["Diagnosis", rx.draft.diagnosis],
  ])
    if (value) line(`${label}: ${value}`);
  y -= 10;
  line("Rx", 20, true);
  for (const item of rx.draft.items.filter(
    (m) => !["STOP", "NOT_REVIEWED"].includes(m.decision),
  )) {
    line(`${item.name} | ${item.strength} | ${item.formulation}`, 12, true);
    line(`${item.dose} | ${item.route} | ${item.frequency}`);
    line(
      `${item.timing} | Duration: ${item.duration}${item.quantity ? ` | Quantity: ${item.quantity}` : ""}`,
    );
    if (item.instructions) line(item.instructions);
    y -= 8;
  }
  if (rx.draft.advice) line(`Advice: ${rx.draft.advice}`);
  if (rx.draft.followUp) line(`Follow-up: ${rx.draft.followUp}`);
  y -= 15;
  line(`Electronically issued by ${rx.doctor.fullName}`, 11, true);
  line(`Integrity: ${rx.digest}`, 8);
  line(
    "Electronic issuance record; no certificate-based digital signature is claimed.",
    8,
  );
  return pdf.save();
}
export const files: Files = {
  async prepare(actor, type, size) {
    const key = `certificate-uploads/${actor}/${randomUUID()}`;
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        ContentType: type,
        ContentLength: size,
      }),
      { expiresIn: 300 },
    );
    return { key, url };
  },
  async validate(key, type, size) {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
    assert(object.ContentLength === size, "File size does not match");
    const bytes = await object.Body?.transformToByteArray();
    assert(bytes, "Empty document");
    validateBytes(bytes, type, size);
    const finalKey = key.replace(
      "certificate-uploads/",
      "doctor-certificates/",
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: finalKey,
        Body: bytes,
        ContentType: type,
        ContentDisposition: "attachment",
        IfNoneMatch: "*",
        ServerSideEncryption: "AES256",
      }),
    );
    return finalKey;
  },
  async document(rx, seconds) {
    try {
      await s3.send(
        new GetObjectCommand({
          Bucket: bucket(),
          Key: rx.documentKey,
          Range: "bytes=0-0",
        }),
      );
    } catch (e) {
      if ((e as { name?: string }).name !== "NoSuchKey") throw e;
      const bytes = await renderPrescription(rx);
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket(),
            Key: rx.documentKey,
            Body: bytes,
            ContentType: "application/pdf",
            ContentDisposition: `attachment; filename="MedPal-${rx.id}.pdf"`,
            IfNoneMatch: "*",
            ServerSideEncryption: "AES256",
          }),
        );
      } catch (writeError) {
        if ((writeError as { name?: string }).name !== "PreconditionFailed")
          throw writeError;
      }
    }
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket(),
        Key: rx.documentKey,
        ResponseContentDisposition: `attachment; filename="MedPal-${rx.id}.pdf"`,
      }),
      { expiresIn: seconds },
    );
  },
  async reviewUrl(key) {
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket(),
        Key: key,
        ResponseContentDisposition: "attachment",
      }),
      { expiresIn: 60 },
    );
  },
};
