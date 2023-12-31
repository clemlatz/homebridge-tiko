import {TikoAccessory} from './TikoAccessory';
import {Characteristic, PlatformAccessory, Service} from 'homebridge';
import {TikoPlatform} from './TikoPlatform';
import {TikoApiError} from './TikoApiError';
import {TikoRoom} from './types';

const defaultRoom: TikoRoom = {
  id: 123,
  name: 'Bedroom',
  targetTemperatureDegrees: 19,
  currentTemperatureDegrees: 17,
  mode: {boost: false, absence: false, frost: false, disableHeating: false},
  status: {heatingOperating: true},
};

describe('#constructor', () => {
  test('builds a new accessory', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {service, platformAccessory} = _buildMocks();

    // when
    new TikoAccessory(platform, platformAccessory);

    // then
    expect(platformAccessory.getService).toHaveBeenCalledWith('AccessoryInformation');
    expect(service.setCharacteristic).toHaveBeenCalledWith('Manufacturer', 'Tiko');
    expect(service.setCharacteristic).toHaveBeenCalledWith('Model', 'Tiko');
    expect(service.setCharacteristic).toHaveBeenCalledWith('SerialNumber', '1234');
  });
});

describe('#getTargetTemperature', () => {
  test('queries and return target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      targetTemperatureDegrees: 19,
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const temperature = await tikoAccessory.getTargetTemperature();

    // then
    expect(temperature).toBe(19);
  });

  test('queries and return 10 if target temperature is below 10', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      targetTemperatureDegrees: 7,
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const temperature = await tikoAccessory.getTargetTemperature();

    // then
    expect(temperature).toBe(10);
  });

  test('catches and logs error', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);
    (platform.tiko.getRoom as jest.Mock).mockRejectedValue(new TikoApiError('Oops!'));

    // when
    const promise = tikoAccessory.getTargetTemperature();

    // then
    await expect(promise).rejects.toEqual(new platform.api.hap.HapStatusError(
      platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    ));
    expect(platform.log.error).toHaveBeenCalledWith('An error occurred while trying to get targetTemperatureDegrees: Oops!');
  });
});

describe('#setTargetTemperature', () => {
  test('sets target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetTemperature('19');

    // then
    expect(platform.tiko.setTargetTemperature).toHaveBeenCalledWith(1234, 19);
  });

  test('ignores new temperature if a mode is set', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      targetTemperatureDegrees: 17,
      mode: {
        ...defaultRoom.mode,
        absence: true,
      },
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetTemperature('19');

    // then
    expect(platform.tiko.setTargetTemperature).not.toHaveBeenCalled();
  });

  test('catches and logs error', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);
    (platform.tiko.setTargetTemperature as jest.Mock).mockRejectedValue(new TikoApiError('Oops!'));

    // when
    const promise = tikoAccessory.setTargetTemperature('19');

    // then
    await expect(promise).rejects.toEqual(new platform.api.hap.HapStatusError(
      platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    ));
    expect(platform.log.error).toHaveBeenCalledWith('An error occurred while trying to set target temperature: Oops!');
  });
});

describe('#getCurrentTemperature', () => {
  test('queries and return current temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      currentTemperatureDegrees: 17,
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const temperature = await tikoAccessory.getCurrentTemperature();

    // then
    expect(temperature).toBe(17);
  });

  test('catches and logs error', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);
    (platform.tiko.getRoom as jest.Mock).mockRejectedValue(new TikoApiError('Oops!'));

    // when
    const promise = tikoAccessory.getCurrentTemperature();

    // then
    await expect(promise).rejects.toEqual(new platform.api.hap.HapStatusError(
      platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    ));
    expect(platform.log.error).toHaveBeenCalledWith('An error occurred while trying to get currentTemperatureDegrees: Oops!');
  });
});

describe('#getCurrentHeatingCoolingState', () => {
  test('queries and return HEAT for AUTO', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      mode: {boost: false, absence: false, frost: false, disableHeating: false},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getCurrentHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.HEAT);
  });

  test('queries and return current heater state', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      mode: {boost: false, absence: false, frost: true, disableHeating: false},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getCurrentHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.OFF);
  });

  test('catches and logs error', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);
    (platform.tiko.getRoom as jest.Mock).mockRejectedValue(new TikoApiError('Oops!'));

    // when
    const promise = tikoAccessory.getCurrentHeatingCoolingState();

    // then
    await expect(promise).rejects.toEqual(new platform.api.hap.HapStatusError(
      platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    ));
    expect(platform.log.error).toHaveBeenCalledWith('An error occurred while trying to get mode for room "Bedroom": Oops!');
  });
});

describe('#getCurrentTargetCoolingState', () => {
  test('returns OFF state for "disableHeating" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      mode: {
        ...defaultRoom.mode,
        disableHeating: true,
      },
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.OFF);
  });

  test('returns OFF state for "frost" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      mode: {
        ...defaultRoom.mode,
        frost: true,
      },
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.OFF);
  });

  test('returns COOL state for "absence" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      mode: {
        ...defaultRoom.mode,
        absence: true,
      },
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.COOL);
  });

  test('returns HEAT state for "boost" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      mode: {
        ...defaultRoom.mode,
        boost: true,
      },
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.HEAT);
  });

  test('returns AUTO state if no mode is returned', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.AUTO);
  });

  test('catches and logs error', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);
    (platform.tiko.getRoom as jest.Mock).mockRejectedValue(new TikoApiError('Oops!'));

    // when
    const promise = tikoAccessory.getTargetHeatingCoolingState();

    // then
    await expect(promise).rejects.toEqual(new platform.api.hap.HapStatusError(
      platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    ));
    expect(platform.log.error).toHaveBeenCalledWith('An error occurred while trying to get mode for room "Bedroom": Oops!');
  });
});

describe('#setTargetHeatingCoolingState', () => {
  test('sets mode "frost" for OFF state and updates target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ... defaultRoom,
      targetTemperatureDegrees: 10,
    });
    const {platformAccessory, service} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.OFF,
    );

    // then
    expect(platform.tiko.setRoomMode).toHaveBeenCalledWith(1234, 'frost');
    expect(service.setCharacteristic).toHaveBeenCalledWith(platform.Characteristic.TargetTemperature, 10);
  });

  test('sets mode "absence" for COOL state and updates target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      targetTemperatureDegrees: 17,
    });
    const {platformAccessory, service} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.COOL,
    );

    // then
    expect(platform.tiko.setRoomMode).toHaveBeenCalledWith(1234, 'absence');
    expect(service.setCharacteristic).toHaveBeenCalledWith(platform.Characteristic.TargetTemperature, 17);
  });

  test('sets mode "boost" for HEAT state and updates target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      targetTemperatureDegrees: 25,
    });
    const {platformAccessory, service} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.HEAT,
    );

    // then
    expect(platform.tiko.setRoomMode).toHaveBeenCalledWith(1234, 'boost');
    expect(service.setCharacteristic).toHaveBeenCalledWith(platform.Characteristic.TargetTemperature, 25);
  });

  test('sets mode to null for AUTO state and updates target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      ...defaultRoom,
      targetTemperatureDegrees: 19,
    });
    const {platformAccessory, service} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.AUTO,
    );

    // then
    expect(platform.tiko.setRoomMode).toHaveBeenCalledWith(1234, null);
    expect(service.setCharacteristic).toHaveBeenCalledWith(platform.Characteristic.TargetTemperature, 19);
  });

  test('catches and logs error', async () => {
    // given
    const platform = _buildTikoPlatformMock(defaultRoom);
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);
    (platform.tiko.setRoomMode as jest.Mock).mockRejectedValue(new TikoApiError('Oops!'));

    // when
    const promise = tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.HEAT,
    );

    // then
    await expect(promise).rejects.toEqual(new platform.api.hap.HapStatusError(
      platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    ));
    expect(platform.log.error).toHaveBeenCalledWith('An error occurred while trying to set mode "boost" for room "Bedroom": Oops!');
  });
});

function _buildTikoPlatformMock(room: TikoRoom) {
  return {
    Service: {
      AccessoryInformation: 'AccessoryInformation',
    },
    Characteristic: {
      Manufacturer: 'Manufacturer',
      Model: 'Model',
      SerialNumber: 'SerialNumber',
      TargetHeatingCoolingState: {
        OFF: 0,
        COOL: 1,
        HEAT: 2,
        AUTO: 3,
      },
      TargetTemperature: 'TargetTemperature',
      TemperatureDisplayUnits: {
        CELSIUS: 'CELSIUS',
      },
    },
    tiko: {
      getRoom: jest.fn(() => room),
      setTargetTemperature: jest.fn(),
      setRoomMode: jest.fn(),
    },
    log: {
      debug: jest.fn(),
      error: jest.fn(),
    },
    api: {
      hap: {
        HapStatusError: Error,
        HAPStatus: {
          SERVICE_COMMUNICATION_FAILURE: 1,
        },
      },
    },
  } as unknown as TikoPlatform;
}

function _buildMocks({roomId} = {roomId: 1234}) {
  const characteristic = {
    onSet: jest.fn(),
    onGet: jest.fn(),
  } as unknown as Characteristic;
  const service = {
    setCharacteristic: jest.fn(),
    getCharacteristic: jest.fn(() => characteristic),
  } as unknown as Service;
  const platformAccessory = {
    getService: jest.fn(() => service),
    context: {
      room: {
        id: roomId,
        name: 'Bedroom',
      },
    },
  } as unknown as PlatformAccessory;
  return {characteristic, service, platformAccessory};
}
