import TikoAPI from './TikoAPI';
import {PlatformConfig} from 'homebridge';
import {ApolloClient, NormalizedCacheObject} from '@apollo/client/core';
import {getRoomQuery} from './queries/getRoomQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {TikoLoginResponse, TikoProperty, TikoPropertyResponse, TikoRoom, TikoRoomResponse} from './types';
import {setTemperatureQuery} from './queries/setTemperatureQuery';
import {authenticationQuery} from './queries/authenticationQuery';
import {setRoomModeQuery} from './queries/setRoomMode';

describe('#authenticate', () => {
  test('authenticates user with credentials in config', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
    } as PlatformConfig;
    const userDetailsFromApi: TikoLoginResponse = {
      data: {
        logIn: {
          token: 'abed1234',
          user: {
            properties: [{id: 123}],
          },
        },
      },
    };
    const clientMock = _mockClientAndRespond(userDetailsFromApi);

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId = jest.fn();

    // when
    await tikoApi.authenticate();

    // then
    expect(clientMock.mutate).toHaveBeenCalledWith({
      mutation: authenticationQuery,
      variables: {
        email: 'user@example.net',
        password: 'p4ssw0rd',
        langCode: 'fr',
        retainSession: true,
      },
    });
    expect(clientMock.setLink).toHaveBeenCalled();
    expect(tikoApi.setPropertyId).toHaveBeenCalledWith(123);
  });

  test('authenticates user with provided propertyId', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      propertyId: 789,
    } as PlatformConfig;
    const userDetailsFromApi: TikoLoginResponse = {
      data: {
        logIn: {
          token: 'abed1234',
          user: {
            properties: [{id: 123}],
          },
        },
      },
    };
    const clientMock = _mockClientAndRespond(userDetailsFromApi);

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId = jest.fn();

    // when
    await tikoApi.authenticate();

    // then
    expect(tikoApi.setPropertyId).toHaveBeenCalledWith(789);
  });
});

describe('#getAllRooms', () => {
  test('queries API and returns property for given id ', async () => {
    // given
    const configMock = {} as PlatformConfig;
    const roomFromApi: TikoRoom = {
      id: 456,
      name: 'Garage',
      targetTemperatureDegrees: 19,
      currentTemperatureDegrees: 17,
      mode: {boost: false, absence: false, frost: false, disableHeating: false},
      status: {heatingOperating: true},
    };
    const propertyFromApi: TikoProperty = {id: 123, rooms: [roomFromApi]};
    const clientMock = _mockClientAndRespond({
      data: {
        property: propertyFromApi,
      },
    });

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId(123);

    // when
    const returnedRooms = await tikoApi.getAllRooms();

    // then
    expect(clientMock.query).toHaveBeenCalledWith({
      query: getPropertyQuery,
      variables: {id: 123},
    });
    expect(returnedRooms).toStrictEqual([roomFromApi]);
  });
});

describe('#getRoom', () => {
  test('queries API and returns room for given id ', async () => {
    // given
    const configMock = {} as PlatformConfig;
    const roomFromApi: TikoRoom = {
      id: 456,
      name: 'Garage',
      targetTemperatureDegrees: 19,
      currentTemperatureDegrees: 17,
      mode: {boost: false, absence: false, frost: false, disableHeating: false},
      status: {heatingOperating: true},
    };
    const clientMock = _mockClientAndRespond({
      data: {
        property: {
          room: roomFromApi,
        },
      },
    });

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId(123);

    // when
    const returnedRoom = await tikoApi.getRoom(456);

    // then
    expect(clientMock.query).toHaveBeenCalledWith({
      query: getRoomQuery,
      variables: {propertyId: 123, roomId: 456},
      fetchPolicy: 'no-cache',
    });
    expect(returnedRoom).toBe(roomFromApi);
  });
});

describe('#setTargetTemparature', () => {
  test('queries API to set given temperature for given room id', async () => {

    // given
    const configMock = {} as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId(123);

    // when
    await tikoApi.setTargetTemperature(456, 21);

    // then
    expect(clientMock.mutate).toHaveBeenCalledWith({
      mutation: setTemperatureQuery,
      variables: {propertyId: 123, roomId: 456, temperature: 21},
    });
  });
});

describe('#setMode', () => {
  test('queries API to set "frost" mode for given room id', async () => {

    // given
    const configMock = {} as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId(123);

    // when
    await tikoApi.setRoomMode(456, 'frost');

    // then
    expect(clientMock.mutate).toHaveBeenCalledWith({
      mutation: setRoomModeQuery,
      variables: {propertyId: 123, roomId: 456, mode: 'frost'},
    });
  });

  test('queries API to set "false" if given mode is null', async () => {

    // given
    const configMock = {} as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);

    const tikoApi = new TikoAPI(configMock, clientMock);
    tikoApi.setPropertyId(123);

    // when
    await tikoApi.setRoomMode(456, null);

    // then
    expect(clientMock.mutate).toHaveBeenCalledWith({
      mutation: setRoomModeQuery,
      variables: {propertyId: 123, roomId: 456, mode: false},
    });
  });
});

function _mockClientAndRespond(response: TikoLoginResponse | TikoPropertyResponse | TikoRoomResponse | null) {
  return {
    query: jest.fn().mockResolvedValue(response),
    mutate: jest.fn().mockResolvedValue(response),
    setLink: jest.fn(),
  } as unknown as jest.Mocked<ApolloClient<NormalizedCacheObject>>;
}
