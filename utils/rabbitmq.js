const amqp = require('amqplib');

let channel = null;

const getChannel = async () => {
  if (!channel) {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
  }
  return channel;
};

module.exports = { getChannel };
