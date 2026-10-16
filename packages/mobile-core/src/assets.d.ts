// Metro resolves an image import to an asset id. The apps include this file
// in their tsconfig, since they compile mobile-core from source.
declare module "*.png" {
  const asset: number;
  export default asset;
}
