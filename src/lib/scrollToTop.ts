export type ScrollFunction = (options: ScrollToOptions) => unknown

export function scrollToTop(scroll: ScrollFunction = window.scrollTo.bind(window)): void {
  void scroll({ top: 0, left: 0 })
}
