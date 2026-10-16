// Metro resolves an image import to an asset id (the Expo apps declare the same).
declare module "*.png" {
  const asset: number;
  export default asset;
}
