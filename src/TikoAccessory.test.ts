import {TikoAccessory} from './TikoAccessory';
import {Characteristic, PlatformAccessory, Service} from 'homebridge';
import {TikoPlatform} from './TikoPlatform';

describe('#constructor', () => {
  test('builds a new accessory', async () => {
    // given
    const platform = {
      Service: {
        AccessoryInformation: 'AccessoryInformation',
      },
      Characteristic: {
        Manufacturer: 'Manufacturer',
        Model: 'Model',
        SerialNumber: 'SerialNumber',
        TemperatureDisplayUnits: {
          CELSIUS: 'CELSIUS',
        },
      },
    } as unknown as TikoPlatform;
    const characteristic = {
      onSet: jest.fn(),
      onGet: jest.fn(),
    } as unknown as Characteristic;
    const service = {
      setCharacteristic: jest.fn(),
      getCharacteristic: jest.fn(() => characteristic),
    } as unknown as Service;
    const accessory = {
      getService: jest.fn(() => service),
      context: {
        room: {
          id: 1234,
          name: 'Bedroom',
        },
      },
    } as unknown as PlatformAccessory;

    // when
    new TikoAccessory(platform, accessory);

    // then
    expect(accessory.getService).toHaveBeenCalledWith('AccessoryInformation');
    expect(service.setCharacteristic).toHaveBeenCalledWith('Manufacturer', 'Tiko');
    expect(service.setCharacteristic).toHaveBeenCalledWith('Model', 'Tiko');
    expect(service.setCharacteristic).toHaveBeenCalledWith('SerialNumber', 1234);

  });
});
