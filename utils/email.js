import nodemailer from 'nodemailer';

const sendEmail = async (option) => {

    // create Transporter, here we are using mailtrap service.
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // define email options
    const emailOptions = {
       from: "Cineflex support<suppoert@cineflex.com>",
       to: option.email,
       subject: option.subject,
       text: option.message 
    }

    await transporter.sendMail(emailOptions);
};

export { sendEmail };

/* 
    we are using mailtrap service
    Mailtrap is a fake SMTP server and email sandbox designed for development and testing.
    It captures emails sent by your app and displays them in a web UI
    without actually sending them to real recipients.
*/