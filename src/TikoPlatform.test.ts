import TikoAPI from './TikoAPI';
import {API, Logger, PlatformConfig} from 'homebridge';
import {TikoPlatform} from './TikoPlatform';
import {TikoApiError} from './TikoApiError';
import TikoApiWithThrottle from './TikoApiWithThrottle';

jest.mock('./TikoAPI');

describe('#constructor', () => {
  test('logs error and quits if name is missing in config', () => {
    const {logMock, configMock, homebridgeApiMock, tikoApiMock} = _buildMocks();
    configMock.name = undefined;

    // when
    new TikoPlatform(logMock, configMock, homebridgeApiMock);

    // then
    expect(logMock.error).toHaveBeenCalledWith('Missing required parameter "name" in config');
    expect(tikoApiMock.authenticate).not.toHaveBeenCalled();
  });

  test('logs error and quits if username is missing in config', () => {
    const {logMock, configMock, homebridgeApiMock, tikoApiMock} = _buildMocks();
    configMock.login = undefined;

    // when
    new TikoPlatform(logMock, configMock, homebridgeApiMock);

    // then
    expect(logMock.error).toHaveBeenCalledWith('Missing required parameter "login" in config');
    expect(tikoApiMock.authenticate).not.toHaveBeenCalled();
  });

  test('logs error and quits if password is missing in config', () => {
    const {logMock, configMock, homebridgeApiMock, tikoApiMock} = _buildMocks();
    configMock.password = undefined;

    // when
    new TikoPlatform(logMock, configMock, homebridgeApiMock);

    // then
    expect(logMock.error).toHaveBeenCalledWith('Missing required parameter "password" in config');
    expect(tikoApiMock.authenticate).not.toHaveBeenCalled();
  });
});

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
    } as unknown as TikoApiWithThrottle;
    TikoApiWithThrottle.build = jest.fn(() => tikoApiMock);

    const tikoPlatform = new TikoPlatform(logMock, configMock, homebridgeApi);

    // when
    await tikoPlatform.discoverDevices();

    // then
    expect(TikoApiWithThrottle.build).toHaveBeenCalled();
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
    } as unknown as TikoApiWithThrottle;
    TikoApiWithThrottle.build = jest.fn(() => tikoApiMock);

    const tikoPlatform = new TikoPlatform(logMock, configMock, homebridgeApi);

    // when
    await tikoPlatform.discoverDevices();

    // then
    expect(logMock.error).toHaveBeenCalledWith('An error occurred while trying to login: Oops!');
    expect(tikoApiMock.getAllRooms).not.toHaveBeenCalled();
  });

  test('handles and logs api errors', async () => {
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
      authenticate: jest.fn(() => []),
      getAllRooms: jest.fn().mockRejectedValue(new TikoApiError('Oops!')),
    } as unknown as TikoApiWithThrottle;
    TikoApiWithThrottle.build = jest.fn(() => tikoApiMock);

    const tikoPlatform = new TikoPlatform(logMock, configMock, homebridgeApi);

    // when
    await tikoPlatform.discoverDevices();

    // then
    expect(logMock.error).toHaveBeenCalledWith('An error occurred while trying to get rooms: Oops!');
  });
});

function _buildMocks() {
  const logMock = {
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
  const configMock = {
    name: 'My Tiko',
    login: 'user@example.net',
    password: 'password',
  } as unknown as PlatformConfig;
  const homebridgeApiMock = {
    hap: {},
    on: jest.fn(),
  } as unknown as API;

  const tikoApiMock = {
    authenticate: jest.fn(),
    getAllRooms: jest.fn(() => []),
  } as unknown as TikoAPI;
  TikoAPI.build = jest.fn(() => tikoApiMock);
  return {logMock, configMock, homebridgeApiMock, tikoApiMock};
}
