import { parseCloudinaryUrl } from '../src/shared/storage/cloudinary-url.util';

describe('parseCloudinaryUrl', () => {
  it('extrai cloud_name, api_key e api_secret da CLOUDINARY_URL', () => {
    expect(parseCloudinaryUrl('cloudinary://123456:s3cr3t@meu-cloud')).toEqual({
      cloud_name: 'meu-cloud',
      api_key: '123456',
      api_secret: 's3cr3t',
    });
  });

  it('devolve null quando ausente, malformada ou com protocolo errado', () => {
    expect(parseCloudinaryUrl(undefined)).toBeNull();
    expect(parseCloudinaryUrl('')).toBeNull();
    expect(parseCloudinaryUrl('nao-e-url')).toBeNull();
    expect(parseCloudinaryUrl('https://123456:s3cr3t@meu-cloud')).toBeNull();
    expect(parseCloudinaryUrl('cloudinary://123456@meu-cloud')).toBeNull();
  });
});
