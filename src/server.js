const { getEnv } = require('./config/env');
const app = require('./app');

const { PORT } = getEnv();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
