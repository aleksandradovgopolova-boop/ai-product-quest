/** Sprite sheets are imported for their URL; the bundler inlines or emits the file. */
declare module "*.png" {
  const source: string;
  export default source;
}
