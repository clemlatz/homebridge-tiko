import {awaitUntilTimeout} from './awaitUntilTimeout';
import {TimeoutError} from './TimeoutError';

describe('#awaitUntilTimeout', () => {
  test('resolves if given promise resolve before timeout', async () => {
    // given
    const promiseValue = Symbol();
    const givenPromise = new Promise((resolve) => setTimeout(() => resolve(promiseValue), 100));

    // when
    const resultPromise = awaitUntilTimeout(givenPromise, 1000);

    // then
    await expect(resultPromise).resolves.toEqual(promiseValue);
  });

  test('rejects if given promise does not resolve before timeout', async () => {
    // given
    const givenPromise = new Promise((resolve) => setTimeout(resolve, 1000));

    // when
    const resultPromise = awaitUntilTimeout(givenPromise, 100);

    // then
    await expect(resultPromise).rejects.toBeInstanceOf(TimeoutError);
  });
});
