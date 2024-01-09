export async function awaitUntilTimeout(promise: Promise<unknown>, timeLimitInMs = 1000): Promise<unknown> {
  let timer: NodeJS.Timeout | null = null;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(reject, timeLimitInMs, new Error('timeout!'));
    });
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
