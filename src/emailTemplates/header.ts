export const getEmailHeader = () => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Group8a Portal</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🔐 Group8a Reporting Portal</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Secure Authentication System</p>
        </div>
        
        <!-- Email Content Container -->
        <div style="padding: 30px;">
  `;
};



type EmailHeaderOptions = {
  title: string;
  portalName: string;
  subtitle: string;

  // Theme (change once, reflected everywhere)
  fontFamily: string;
  pageBg: string;
  containerBg: string;

  headerBg: string;
  headerText: string;

  contentPadding: string;
  maxWidth: string;
};

export const getEmailHeaderTest = (overrides: Partial<EmailHeaderOptions> = {}) => {
  const opts: EmailHeaderOptions = {
    title: "Group8a Portal",
    portalName: "🔐 Group8a Reporting Portal",
    subtitle: "Secure Authentication System",

    fontFamily: "Arial, sans-serif",
    pageBg: "#f9f9f9",
    containerBg: "#ffffff",

    headerBg: "#af4caaff",
    headerText: "#ffffff",

    contentPadding: "30px",
    maxWidth: "600px",

    ...overrides,
  };

  const styles = {
    body: `font-family:${opts.fontFamily}; margin:0; padding:0; background-color:${opts.pageBg};`,
    container: `max-width:${opts.maxWidth}; margin:0 auto; background-color:${opts.containerBg};`,
    header: `background-color:${opts.headerBg}; color:${opts.headerText}; padding:20px; text-align:center;`,
    h1: `margin:0; font-size:24px; color:${opts.headerText};`,
    subtitle: `margin:5px 0 0 0; font-size:14px; color:${opts.headerText};`,
    content: `padding:${opts.contentPadding};`,
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${opts.title}</title>
    </head>
    <body style="${styles.body}">
      <div style="${styles.container}">
        <!-- Header -->
        <div style="${styles.header}">
          <h1 style="${styles.h1}">${opts.portalName}</h1>
          <p style="${styles.subtitle}">${opts.subtitle}</p>
        </div>

        <!-- Email Content Container -->
        <div style="${styles.content}">
  `;
};