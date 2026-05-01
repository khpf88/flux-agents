export const logger = {
  info: (event: string, data: any) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event,
      ...data
    }));
  },
  warn: (event: string, data: any) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      event,
      ...data
    }));
  },
  error: (event: string, error: any, data: any) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event,
      error: error.message || error,
      ...data
    }));
  }
};
