import TikoApiWithThrottle from './TikoApiWithThrottle';
import {PlatformConfig} from 'homebridge';
import {ApolloClient, NormalizedCacheObject} from '@apollo/client/core';

jest.mock('@apollo/client/core');

describe('#getRoom', () => {
  test('calls API only once for identical requests', async () => {
    // given
    const config = {} as PlatformConfig;
    const client = {
      query: jest.fn(() => new Promise((resolve) => {
        setTimeout(() => resolve({
          data: {
            property: {
              room: {},
            },
          },
        }), 1000);
      })),
      setLink: jest.fn(),
    } as unknown as jest.Mocked<ApolloClient<NormalizedCacheObject>>;
    const apiWithThrottle = new TikoApiWithThrottle(config, client);

    // when
    await Promise.all([
      apiWithThrottle.getRoom(1),
      apiWithThrottle.getRoom(1),
      apiWithThrottle.getRoom(2),
    ]);

    // then
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
