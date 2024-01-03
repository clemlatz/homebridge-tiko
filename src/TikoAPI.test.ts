import TikoAPI from './TikoAPI';
import {PlatformConfig} from 'homebridge';
import {ApolloClient, ApolloError, createHttpLink, NormalizedCacheObject} from '@apollo/client/core';
import {getRoomQuery} from './queries/getRoomQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {TikoLoginResponse, TikoProperty, TikoPropertyResponse, TikoRoom, TikoRoomResponse} from './types';
import {setTemperatureQuery} from './queries/setTemperatureQuery';
import {authenticationQuery} from './queries/authenticationQuery';
import {setRoomModeQuery} from './queries/setRoomMode';
import {TikoApiError} from './TikoApiError';

jest.mock('@apollo/client/core');

describe('#build', () => {
  test('builds a TikoAPI service', () => {
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
    } as PlatformConfig;

    // when
    const tikoApi = TikoAPI.build(configMock);

    // then
    expect(tikoApi).toBeInstanceOf(TikoAPI);
  });
});

describe('#constructor', () => {
  test('sets link to the default endpoint if none specified in config', () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);

    // when
    new TikoAPI(configMock, clientMock);

    // then
    expect(createHttpLink).toHaveBeenCalledWith({'uri': 'https://particuliers-tiko.fr/api/v3/graphql/'});
  });

  test('sets link to the endpoint specified in config', () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      endpoint: 'https://example.net/api/v3/graphql/',
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);

    // when
    new TikoAPI(configMock, clientMock);

    // then
    expect(createHttpLink).toHaveBeenCalledWith({'uri': 'https://example.net/api/v3/graphql/'});
  });
});

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

  test('catches ApolloError and throws TikoApiError', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      propertyId: 789,
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);
    const error = new ApolloError({errorMessage: 'An error occurred'});
    error.message = 'An error occurred';
    clientMock.mutate.mockRejectedValue(error);

    const tikoApi = new TikoAPI(configMock, clientMock);

    // when
    const promise = tikoApi.authenticate();

    // then
    await expect(promise).rejects.toEqual(new TikoApiError('An error occurred'));
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

  test('catches ApolloError and throws TikoApiError', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      propertyId: 789,
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);
    const error = new ApolloError({errorMessage: 'An error occurred'});
    error.message = 'An error occurred';
    clientMock.query.mockRejectedValue(error);

    const tikoApi = new TikoAPI(configMock, clientMock);

    // when
    const promise = tikoApi.getAllRooms();

    // then
    await expect(promise).rejects.toEqual(new TikoApiError('An error occurred'));
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

  test('catches ApolloError and throws TikoApiError', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      propertyId: 789,
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);
    const error = new ApolloError({errorMessage: 'An error occurred'});
    error.message = 'An error occurred';
    clientMock.query.mockRejectedValue(error);

    const tikoApi = new TikoAPI(configMock, clientMock);

    // when
    const promise = tikoApi.getRoom(1);

    // then
    await expect(promise).rejects.toEqual(new TikoApiError('An error occurred'));
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

  test('catches ApolloError and throws TikoApiError', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      propertyId: 789,
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);
    const error = new ApolloError({errorMessage: 'An error occurred'});
    error.message = 'An error occurred';
    clientMock.mutate.mockRejectedValue(error);

    const tikoApi = new TikoAPI(configMock, clientMock);

    // when
    const promise = tikoApi.setTargetTemperature(1, 19);

    // then
    await expect(promise).rejects.toEqual(new TikoApiError('An error occurred'));
  });
});

describe('#setRoomMode', () => {
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

  test('catches ApolloError and throws TikoApiError', async () => {
    // given
    const configMock = {
      platform: 'Tiko',
      login: 'user@example.net',
      password: 'p4ssw0rd',
      propertyId: 789,
    } as PlatformConfig;
    const clientMock = _mockClientAndRespond(null);
    const error = new ApolloError({errorMessage: 'An error occurred'});
    error.message = 'An error occurred';
    clientMock.mutate.mockRejectedValue(error);

    const tikoApi = new TikoAPI(configMock, clientMock);

    // when
    const promise = tikoApi.setRoomMode(1, 'boost');

    // then
    await expect(promise).rejects.toEqual(new TikoApiError('An error occurred'));
  });
});

function _mockClientAndRespond(response: TikoLoginResponse | TikoPropertyResponse | TikoRoomResponse | null) {
  return {
    query: jest.fn().mockResolvedValue(response),
    mutate: jest.fn().mockResolvedValue(response),
    setLink: jest.fn(),
  } as unknown as jest.Mocked<ApolloClient<NormalizedCacheObject>>;
}
