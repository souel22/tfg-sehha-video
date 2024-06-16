const Appointment = require('../models/appointmentModel');
const { getChannel } = require('../utils/rabbitmq');

const handleAppointmentMessage = async (msg) => {
  const appointmentData = JSON.parse(msg.content.toString());

  const appointment = new Appointment({
    user: appointmentData.user,
    specialist: appointmentData.specialist,
    appointmentId: appointmentData.appointmentId,
    events: [{ event: 'appointment_created', timestamp: new Date() }]
  });

  try {
    await appointment.save();
    console.log('Appointment saved:', appointment);
  } catch (error) {
    console.error('Error saving appointment:', error);
  }
};

const setupRabbitMQConsumer = async () => {
  const channel = await getChannel();
  channel.assertQueue('appointment_created', { durable: true });
  channel.consume('appointment_created', handleAppointmentMessage, { noAck: true });
};

module.exports = setupRabbitMQConsumer;
