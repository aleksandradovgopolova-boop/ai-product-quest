/**
 * Sprite sheets are imported for their URL. The bundlers disagree on the shape: Vite hands back a
 * string (or an inlined data URI), Next hands back a static image object. Both are accepted.
 */
declare module "*.png" {
  const source: string | { src: string };
  export default source;
}
