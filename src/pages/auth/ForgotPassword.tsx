import React, { useState } from "react";
import { useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { ROUTES } from "../../routes/routes.constants";
import EmailInput from "../../common_components/EmailInput";
import "../../App.css";
import ValidationMessage from "../../common_components/Validation";
import { emailRegex } from "../../helper/regex";
import CustomLoader from '../../common_components/CustomLoader';
import { ApiCall } from "../../helper/axios";
import AuthErrorBanner from "./AuthErrorBanner";
import AppButton from "../../common_components/AppButton";

const validationSchema = Yup.object({
  email: Yup.string()
    .trim()
    .required(ValidationMessage.emailRequired)
    .matches(emailRegex, ValidationMessage.emailInvalid)
    .email(ValidationMessage.emailInvalid),
});

interface ApiError {
  title: string;
  description?: string;
}

export default function ForgotPassword(): React.ReactElement {
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      console.log('value', values);

      if (formik.isValid) {
        try {
          const res: any = await ApiCall('POST', "/api/auth/forgot-password", values);
          if (res?.data?.success && res?.status === 200) {
            setApiError(null);
           console.log('res',res);
           navigate(ROUTES.login.path, {state : 'A password reset link has been sent to your email address.'});
          } else {
            const msg = res?.response?.data?.message || 'Something went wrong'
            setApiError({ title: msg, description: "Please try again." });
            formik.setSubmitting(false);
          }
        } catch (error) {
          setApiError({ title: 'Something went wrong', description: "Please try again." });
          formik.setSubmitting(false);
        }
      }
    },
  });

  const handleChange = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e?.target?.value || '';
    formik.setFieldValue(name, value)
    if (apiError) setApiError(null);
  };

  const handleBlur = (name: string) => {
    formik.setFieldTouched(name, true)
  };

  return (
    <Box className="login-page-container">
      {/* Logo - Top Left */}
      <Box className="login-logo-container" sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img alt="GROUP 8A Logo" src="/assets/loginImage/logo-final.svg" className="login-logo-img" />
      </Box>

      {/* Login Form Card - Absolutely Positioned */}
      <Paper elevation={0} className="login-form-card">
        <FormikProvider value={formik}>
          <Box component="form" onSubmit={formik.handleSubmit} className="login-form">
            {/* Header Section */}
            <Box className="login-header">
              <Typography variant="h4" className="login-title">
                LOREM IPSUM DOLOR SIT
              </Typography>
              <Typography variant="body1" className="login-subtitle">
                Enter your details to login reporting app portal below
              </Typography>
            </Box>

            {/* Form Fields - Matching Figma Structure */}
            <Box className="login-form-fields">
              {/* First Section: Form Inputs + Forgot Password */}
              <Box className="login-form-inputs-wrapper">
                {/* Form Inputs */}
                <Box className="login-form-inputs">
                {apiError && (
                    <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                      <AuthErrorBanner message={apiError} />
                    </Box>
                  )}
                  <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                    {/* Email Input */}
                    <EmailInput
                      label="Email"
                      placeholder="Enter email"
                      type="email"
                      value={formik.values.email}
                      onChange={(e) => handleChange('email', e)}
                      onBlur={(e) => handleBlur('email')}
                      autoComplete="off"
                      errors={formik.errors.email}
                      touched={formik.touched.email}
                      maxLength={50}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Second Section: Sign In Button */}
              <Box className="login-signin-button-container">
                {/* <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  className="login-signin-button"
                  disabled={formik.isSubmitting}
                >
                  {
                    formik.isSubmitting ? <CustomLoader sx={{ color: 'white' }} /> : 'Submit'
                  }
                </Button> */}
                <AppButton type="submit" fullWidth={true} className="login-signin-button" variant="contained" color="primary" disabled={formik.isSubmitting}>   
                {
                    formik.isSubmitting ? <CustomLoader sx={{ color: 'white' }} /> : 'Submit'
                  }
                </AppButton>
              </Box>
              <Box className="login-forgot-password-container back-to-login">
                {/* <Button
                  onClick={() => navigate(ROUTES.login.path, { replace: true })}
                  className="login-forgot-password-link"
                >
                  Back to Login
                </Button> */}
                <AppButton children="Back to Login" onClick={() => navigate(ROUTES.login.path, { replace: true })} className="login-forgot-password-link"></AppButton>
              </Box>
            </Box>
          </Box>
        </FormikProvider>
      </Paper>

      <div className="bird-container bird-container--one"><div className="bird bird--one">&nbsp;</div></div>
      <div className="bird-container bird-container--two"><div className="bird bird--two">&nbsp;</div></div>
      <div className="bird-container bird-container--three"><div className="bird bird--two">&nbsp;</div></div>
      <div className="bird-container bird-container--four"><div className="bird bird--two">&nbsp;</div></div>
    </Box>
  );
}

