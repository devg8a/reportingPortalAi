import React, { useState, useEffect, useRef } from "react";
import { useFormik, FormikProvider } from "formik";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { ROUTES } from "../../routes/routes.constants";
import { logout, otpLoginSuccess, selectAuth, selectToken } from "../../redux/authSlice";
import { AppDispatch } from "../../redux/store";
import "../../App.css";
import { ApiCall } from "../../helper/axios";
import CustomLoader from '../../common_components/CustomLoader';
import OtpInput from 'react-otp-input';
import * as Yup from "yup";
import AuthErrorBanner from "./AuthErrorBanner";
import AppButton from "../../common_components/AppButton";

const validationSchema = Yup.object().shape({
  otp: Yup.string()
    .required("OTP is required")
    .matches(/^[0-9]{6}$/, "OTP must be 6 digits")
});

// Timer duration in seconds (5 minutes = 300 seconds) - Easy to change
const TIMER_DURATION_SECONDS = 300; // 5 minutes

const TIMER_STORAGE_KEY = 'otp_timer_start';

interface ApiError {
  title: string;
  description?: string;
}

export default function Verify(): React.ReactElement {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showResendButton, setShowResendButton] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fromPath = (location.state as any)?.from?.pathname || ROUTES.home.path;

  const token = useSelector(selectToken);
  const userDetail = useSelector(selectAuth);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start or resume timer
  const startTimer = () => {
    const storedStartTime = localStorage.getItem(TIMER_STORAGE_KEY);
    const now = Date.now();
    
    let elapsedSeconds = 0;
    if (storedStartTime) {
      // Timer was already started, calculate elapsed time
      elapsedSeconds = Math.floor((now - parseInt(storedStartTime)) / 1000);
    } else {
      // First time, store start time
      localStorage.setItem(TIMER_STORAGE_KEY, now.toString());
    }

    const remaining = Math.max(0, TIMER_DURATION_SECONDS - elapsedSeconds);
    setRemainingSeconds(remaining);
    setShowResendButton(remaining === 0);

    // Clear existing interval if any
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Start countdown
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setShowResendButton(true);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reset timer
  const resetTimer = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRemainingSeconds(0);
    setShowResendButton(false);
  };

  // Initialize timer on mount
  useEffect(() => {
    startTimer();

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []); // Run only once on mount

  // Handle Resend OTP
  const handleResendOTP = async () => {
    try {
      const payload = {
        temp_token: userDetail?.token,
        entity_type: userDetail?.otpEntityType,
        user_id: userDetail?.otpUserId
      }
      // Reset timer and start again
      await ApiCall('POST', '/api/auth/resend-otp', payload, { Authorization: token })
      resetTimer();
      startTimer();
    } catch (error) {
      console.log('error', error);
      
    }
  };

  if (!token) {
    return <Navigate to={ROUTES.login.path} replace />;
  }

  const formik = useFormik({
    initialValues: {
      otp: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      if (values?.otp?.length === 6) {
        try {
          const payload = {
            temp_token: token,
            otp: values?.otp
          };
          const res: any = await ApiCall("POST", `/api/auth/verify-otp`, payload, { authentication: token });
          console.log('res', res);
          
          if (res?.data?.success && res?.status === 200) {
            const result = res?.data?.data;
            setApiError(null);
            dispatch(
              otpLoginSuccess({
                token: result?.token,
                user: result?.user,
                permissions: result?.permissions,
              })
            );
            navigate(fromPath, { replace: true });
          } else {
            const msg = res?.response?.data?.message || 'Something went wrong'
            setApiError({ title: msg, description: "Please try again." });
            formik.setSubmitting(false);
          }
        } catch (error) {
          setApiError({ title: 'Something went wrong', description: "Please try again." });
          formik.setSubmitting(false);
        }
      } else {
        formik.setSubmitting(false);
      }
    },
  });

  const handleBackLogin = () => {
    // Reset timer when going back to login
    resetTimer();
    // Clear OTP-pending auth state, otherwise AppRoutes will keep redirecting back to /verify
    dispatch(logout());
    navigate(ROUTES.login.path, { replace: true });
  }

  const handleChange = (value: string) => {
    formik.setFieldValue("otp", value);
    if (apiError) setApiError(null);
  }

  return (
    <Box className="login-page-container">
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

            <Box className="login-form-fields">
              <Box className="login-form-inputs-wrapper">
              {apiError && (
                    <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                      <AuthErrorBanner message={apiError} />
                    </Box>
                  )}
                <Box className="login-form-inputs" sx={{ paddingBottom: '15px', width: '100%' }}>
                  <p className="text-otp-verify" style={{ margin: '0' }}>Type Your 6 Digit Security Code</p>
                </Box>
                <Box className="login-form-inputs" sx={{ paddingBottom: '0', width: '100%' }}>
                  <OtpInput
                    value={formik.values.otp}
                    onChange={(value) => handleChange(value)}   // set formik value
                    numInputs={6}
                    containerStyle={{ width: "100%" }}
                    renderInput={(props) => (
                      <div className="otp-input-sec">
                        <input {...props} onBlur={() => formik.setFieldTouched("otp", true)} />
                      </div>
                    )}
                  />
                  <div className="d-flex align-items-end justify-content-between gap-1 w-100">
                  <p className="otp-verify-msg-txt">We have sent OTP to your email address.</p>
                  {showResendButton ? (
                    <AppButton children="Resend OTP" onClick={handleResendOTP} className="login-forgot-password-link line-height-normal"></AppButton>
                  ) : (<Typography
                    sx={{
                      fontSize: '14px',
                      color: '#71717a',
                      fontWeight: 400,
                    }}
                  ><span style={{ fontWeight: 400, color: '#FF64BD' }}>{formatTime(remainingSeconds)}</span></Typography>)}
                  </div>
                 
                  {formik.touched.otp && formik.errors.otp && (
                    <p className="error-field">
                      {formik.errors.otp}
                    </p>
                  )}

                </Box>
              </Box>

              {/* Second Section: Sign In Button */}
              <Box className="login-signin-button-container">
                <AppButton type="submit" fullWidth={true} className="login-signin-button" variant="contained" color="primary" disabled={formik.isSubmitting}>   
                  {
                    formik.isSubmitting ? <CustomLoader sx={{ color: 'white' }} /> : 'Verify & Login'
                  }
                </AppButton>
              </Box>
              <Box className="login-forgot-password-container back-to-login">
                <AppButton children="Back to Login" onClick={() => handleBackLogin()} className="login-forgot-password-link"></AppButton>
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

