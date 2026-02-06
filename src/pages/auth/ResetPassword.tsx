import React, { useEffect, useState } from "react";
import { useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import PasswordInput from "../../common_components/PasswordInput";
import "../../App.css";
import ValidationMessage from "../../common_components/Validation";
import CustomLoader from '../../common_components/CustomLoader';
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/routes.constants";
import { ApiCall } from "../../helper/axios";
import AuthErrorBanner from "./AuthErrorBanner";
import AppButton from "../../common_components/AppButton";
import CommonLoader from "../../common_components/CommonLoader";

const validationSchema = Yup.object({
  newPassword: Yup.string()
    .trim()
    .required(ValidationMessage.passwordRequired)
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .matches(/[a-z]/, "Must contain at least one lowercase letter")
    .matches(/[0-9]/, "Must contain at least one number")
    .matches(/[@$!%*?&#]/, "Must contain at least one special character (@, $, !, %, *, ?, &, #)"),

  confirmPassword: Yup.string()
    .trim()
    .required("Confirm Password is required")
    .oneOf([Yup.ref('newPassword'), null], "Passwords must match"),
});

interface ApiError {
  title: string;
  description?: string;
}

export default function ResetPassword(): React.ReactElement {
  const [loading, setLoading] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const navigate = useNavigate();

  const token = new URLSearchParams(window.location.search).get("token");
  const verifyToken = async () => {
    try {
      const res: any = await ApiCall("GET", `/api/auth/verify-reset-token?token=${token}`, '');

      if (res?.data?.success) {
        setTokenValid(true);
      } else {
        navigate(ROUTES.login.path, { replace: true });
      }
    } catch (err) {
      navigate(ROUTES.login.path, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate(ROUTES.login.path, { replace: true });
      return;
    }

    verifyToken();
  }, []);

  const formik = useFormik({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      
      if (formik.isValid) {
        try {
          const payload = {...values, token : token}
          const res: any = await ApiCall('POST', "/api/auth/reset-password", payload, { authentication: token });
          if (res?.data?.success && res?.status === 200) {
            setApiError(null);
            const result = res.data;
            navigate(ROUTES.login.path, {state : result?.message});
          } else {
            const msg = res?.response?.data?.message || 'Something went wrong'
            setApiError({ title: msg, description: "Please try again." });
            formik.setSubmitting(false);
          }
        } catch (error) {
          formik.setSubmitting(false);
          setApiError({ title: 'Something went wrong', description: "Please try again." });
          console.log('error', error);
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

  if (loading) {
    return (
      <>
        <CommonLoader />
      </>
    );
  }

  if (!tokenValid) return <></>;


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
                    {/* Password Input */}
                    <PasswordInput
                      label="New Password"
                      Placeholder='Enter New Password'
                      value={formik.values.newPassword}
                      errors={formik.errors.newPassword}
                      touched={formik.touched.newPassword}
                      name="newPassword"
                      onChange={(e) => handleChange('newPassword', e)}
                      onBlur={(e) => handleBlur('newPassword')}
                      type='password'
                    />
                  </Box>
                  <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                    {/* Password Input */}
                    <PasswordInput
                      label="Confirmed Password"
                      Placeholder='Enter Confirmed Password'
                      value={formik.values.confirmPassword}
                      errors={formik.errors.confirmPassword}
                      touched={formik.touched.confirmPassword}
                      name="confirmPassword"
                      onChange={(e) => handleChange('confirmPassword', e)}
                      onBlur={(e) => handleBlur('confirmPassword')}
                      type='password'
                    />
                  </Box>
                </Box>


              </Box>

              {/* Second Section: Sign In Button */}
              <Box className="login-signin-button-container">
                <AppButton type="submit" fullWidth={true} className="login-signin-button" variant="contained" color="primary" disabled={formik.isSubmitting}>   {
                  formik.isSubmitting ? <CustomLoader size={20} sx={{ color: "#fff" }} /> : 'Reset Password'
                }
                </AppButton>
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

