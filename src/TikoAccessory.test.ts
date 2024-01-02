import {TikoAccessory} from './TikoAccessory';
import {Characteristic, PlatformAccessory, Service} from 'homebridge';
import {TikoPlatform} from './TikoPlatform';

describe('#constructor', () => {
  test('builds a new accessory', async () => {
    // given
    const platform = _buildTikoPlatformMock();
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
      targetTemperatureDegrees: 7,
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const temperature = await tikoAccessory.getTargetTemperature();

    // then
    expect(temperature).toBe(10);
  });
});

describe('#setTargetTemperature', () => {
  test('sets target temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({ roomId: 1234 });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetTemperature('19');

    // then
    expect(platform.tiko.setTargetTemperature).toHaveBeenCalledWith(1234, 19);
  });
});

describe('#getCurrentTemperature', () => {
  test('queries and return current temperature', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      currentTemperatureDegrees: 17,
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const temperature = await tikoAccessory.getCurrentTemperature();

    // then
    expect(temperature).toBe(17);
  });
});

describe('#getCurrentHeatingCoolingState', () => {
  test('queries and return HEAT for AUTO', async () => {
    // given
    const platform = _buildTikoPlatformMock({
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
      mode: {boost: false, absence: false, frost: true, disableHeating: false},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getCurrentHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.OFF);
  });
});

describe('#getCurrentTargetCoolingState', () => {
  test('returns OFF state for "disableHeating" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      mode: {disableHeating: true},
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
      mode: {frost: true},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.OFF);
  });

  test('returns AUTO state for "absence" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      mode: {absence: true},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.AUTO);
  });

  test('returns AUTO state for "boost" mode', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      mode: {boost: true},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.AUTO);
  });

  test('returns AUTO state if no mode is returned', async () => {
    // given
    const platform = _buildTikoPlatformMock({
      mode: {boost: false, absence: false, frost: false, disableHeating: false},
    });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    const state = await tikoAccessory.getTargetHeatingCoolingState();

    // then
    expect(state).toBe(platform.Characteristic.TargetHeatingCoolingState.AUTO);
  });
});

describe('#setTargetHeatingCoolingState', () => {
  test('sets mode "frost" for OFF state ', async () => {
    // given
    const platform = _buildTikoPlatformMock({ roomId: 1234 });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.OFF,
    );

    // then
    expect(platform.tiko.setRoomMode).toHaveBeenCalledWith(1234, 'frost');
  });

  test('sets mode to null for any other state ', async () => {
    // given
    const platform = _buildTikoPlatformMock({ roomId: 1234 });
    const {platformAccessory} = _buildMocks();
    const tikoAccessory = new TikoAccessory(platform, platformAccessory);

    // when
    await tikoAccessory.setTargetHeatingCoolingState(
      platform.Characteristic.TargetHeatingCoolingState.AUTO.toString(),
    );

    // then
    expect(platform.tiko.setRoomMode).toHaveBeenCalledWith(1234, null);
  });
});

function _buildTikoPlatformMock(response: object = {}) {
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
        HEAT: 2,
        AUTO: 3,
      },
      TemperatureDisplayUnits: {
        CELSIUS: 'CELSIUS',
      },
    },
    tiko: {
      getRoom: () => response,
      setTargetTemperature: jest.fn(),
      setRoomMode: jest.fn(),
    },
    log: {
      debug: jest.fn(),
    },
  } as unknown as TikoPlatform;
}

function _buildMocks({ roomId } = { roomId: 1234 }) {
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
