const { getEnv } = require('./config/env');
const app = require('./app');

const { PORT } = getEnv();
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
