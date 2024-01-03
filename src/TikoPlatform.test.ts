import TikoAPI from './TikoAPI';
import {API, Logger, PlatformConfig} from 'homebridge';
import {TikoPlatform} from './TikoPlatform';
import {TikoApiError} from './TikoApiError';

jest.mock('./TikoAPI');

describe('#discoverDevices', () => {
  test('authenticates and query all rooms', async () => {
    // given
    const logMock = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
    const configMock = {} as PlatformConfig;
    const homebridgeApi = {
      hap: {},
      on: jest.fn(),
    } as unknown as API;

    const tikoApiMock = {
      authenticate: jest.fn(),
      getAllRooms: jest.fn(() => []),
    } as unknown as TikoAPI;
    TikoAPI.build = jest.fn(() => tikoApiMock);

    const tikoPlatform = new TikoPlatform(logMock, configMock, homebridgeApi);

    // when
    await tikoPlatform.discoverDevices();

    // then
    expect(TikoAPI.build).toHaveBeenCalled();
    expect(tikoApiMock.authenticate).toHaveBeenCalled();
    expect(tikoApiMock.getAllRooms).toHaveBeenCalled();
  });

  test('handles and logs authentication errors', async () => {
    const logMock = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
    const configMock = {} as PlatformConfig;
    const homebridgeApi = {
      hap: {},
      on: jest.fn(),
    } as unknown as API;

    const tikoApiMock = {
      authenticate: jest.fn().mockRejectedValue(new TikoApiError('Oops!')),
      getAllRooms: jest.fn(() => []),
    } as unknown as TikoAPI;
    TikoAPI.build = jest.fn(() => tikoApiMock);

    const tikoPlatform = new TikoPlatform(logMock, configMock, homebridgeApi);

    // when
    await tikoPlatform.discoverDevices();

    // then
    expect(logMock.error).toHaveBeenCalledWith('An error occured while trying to login: Oops!');
    expect(tikoApiMock.getAllRooms).not.toHaveBeenCalled();
  })
});
