import createTransporter from '../helper/email';
import { getEmailHeader } from '../emailTemplates/header';
import { getEmailFooter } from '../emailTemplates/footer';
import { getOTPEmailContent } from '../emailTemplates/sendOTPEmail';
import { getLoginEmail } from '../emailTemplates/sendLoginEmail';
import {sendUserLoginInfo} from '../emailTemplates/sendUserLoginInformation'
import {passwordResendEmail} from '../emailTemplates/sendPasswordResetEmail';

export const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    };
    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.error('Full error:', error);
    return false;
  }
};

export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    const header = getEmailHeader();
    const content = getOTPEmailContent(otp);
    const footer = getEmailFooter();
    const html = header + content + footer;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your OTP for Login',
      html: html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

export const sendLoginEmail = async (email, newPassword) => {

  try {
    const transporter = createTransporter();
    const header = getEmailHeader();
    const content = getLoginEmail(email, newPassword);
    const footer = getEmailFooter();
    const html = header + content + footer;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your New Login Credentials',
      html: html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }

};
export const sendUserLoginInformation = async (email, password) => {

  try {
    const transporter = createTransporter();
    const header = getEmailHeader();
    const content = sendUserLoginInfo(email, password);
    const footer = getEmailFooter();
    const html = header + content + footer;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your New Login Credentials',
      html: html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }

};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {

  try {
    const transporter = createTransporter();
    const header = getEmailHeader();
    const content = passwordResendEmail(email, resetLink);
    const footer = getEmailFooter();
    const html = header + content + footer;
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

export const generateSecurePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

  for (let i = 0; i < 5; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
};