import React, { useEffect, useState } from "react";
import { useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { ROUTES } from "../../routes/routes.constants";
import { loginOtpPending, loginSuccess } from "../../redux/authSlice";
import EmailInput from "../../common_components/EmailInput";
import PasswordInput from "../../common_components/PasswordInput";
import "../../App.css";
import ValidationMessage from "../../common_components/Validation";
import { emailRegex } from "../../helper/regex";
import { ApiCall } from "../../helper/axios";
import CustomLoader from '../../common_components/CustomLoader';
import AuthErrorBanner from "./AuthErrorBanner";
import { AppDispatch } from "../../redux/store";
import AppButton from "../../common_components/AppButton";

// Validation schema using Yup
const validationSchema = Yup.object({
    email: Yup.string()
        .trim()
        .required(ValidationMessage.emailRequired)
        .matches(emailRegex, ValidationMessage.emailInvalid)
        .email(ValidationMessage.emailInvalid),
    password: Yup.string()
        .trim()
        .required(ValidationMessage.passwordRequired)
});

interface SuccessBanner {
    title?: string;
    description?: string;
    [key: string]: any;
}

/**
 * Login Page matching Figma design
 * Uses Formik + Yup for validation
 * Responsive design using MUI Grid
 */
export default function Login(): React.ReactElement {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const location = useLocation();
    const [apiError, setApiError] = useState<{ title?: string; description?: string } | null>(null);
    const [successBanner, setSuccessBanner] = useState<SuccessBanner | null>(null);

    useEffect(() => {
        if (location?.state) {
            setSuccessBanner(location?.state);
            navigate(location.pathname, { replace: true });
        }
    }, [location.pathname, location.state, navigate])

    const fromPath: string = (location.state as any)?.from?.pathname || ROUTES.home.path;

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            console.log('value', values);

            if (formik.isValid) {
                try {
                    const res: any = await ApiCall('POST', "/api/auth/login", values);
                    if (res?.data?.success && res?.status === 200) {
                        console.log('res', res);
                        const result = res?.data?.data;
                        setApiError(null);

                        // If 2FA is required, backend returns temp_token (no user/token yet)
                        if (result?.requires_otp) {
                            dispatch(
                                loginOtpPending({
                                    token: result?.temp_token,
                                    otpEntityType: result?.entity_type,
                                    otpUserId: result?.user_id,
                                })
                            );
                            navigate(ROUTES.verify.path, { replace: true });
                        } else {
                            dispatch(
                                loginSuccess({
                                    user: result?.user,
                                    token: result?.token,
                                    permissions: result?.permissions,
                                    requiresOtp: false,
                                })
                            );
                            console.log('fromPath', fromPath, result);

                            navigate(fromPath, { replace: true });
                        }
                    } else {
                        const msg = res?.response?.data?.message || 'Something went wrong'
                        setApiError({ title: msg, description: "Please try again." });
                        formik.setSubmitting(false);
                    }
                } catch (error) {
                    setApiError({ title: 'Something went wrong', description: "Please try again." });
                    formik.setSubmitting(false);
                    console.log('Login error', error);
                }
            }
        },
    });

    const handleChange = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e?.target?.value || '';
        // Clear banner as soon as user starts typing
        if (apiError) setApiError(null);
        if (successBanner) setSuccessBanner(null);
        formik.setFieldValue(name, value)
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
                                <Box className={`login-form-inputs ${successBanner ? 'success-banner' : ''}`}>
                                    {(apiError || successBanner) && (
                                        <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                                            <AuthErrorBanner message={(apiError || successBanner) as any} flag={Boolean(successBanner)} />
                                        </Box>
                                    )}
                                    <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                                        {/* Email Input */}
                                        <EmailInput
                                            label="Email"
                                            placeholder="Enter your email"
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
                                    <Box sx={{ paddingBottom: '15px', width: '100%' }}>
                                        {/* Password Input */}
                                        <PasswordInput
                                            label="Password"
                                            Placeholder='Enter Password'
                                            value={formik.values.password}
                                            errors={formik.errors.password}
                                            touched={formik.touched.password}
                                            name="password"
                                            onChange={(e) => handleChange('password', e)}
                                            onBlur={(e) => handleBlur('password')}
                                            type='password'
                                        />
                                    </Box>
                                </Box>

                                {/* Forgot Password Link */}
                                <Box className="login-forgot-password-container">
                                    <AppButton children="Forgot Password?" onClick={() => navigate(ROUTES.forgotPassword.path)} className="login-forgot-password-link"></AppButton>
                                </Box>
                            </Box>

                            {/* Second Section: Sign In Button */}
                            <Box className="login-signin-button-container">
                                <AppButton type="submit" fullWidth={true} className="login-signin-button" variant="contained" color="primary" disabled={formik.isSubmitting}>   {
                                    formik.isSubmitting ? <CustomLoader color="inherit" /> : 'Sign In'
                                }
                                </AppButton>
                            </Box>
                        </Box>
                    </Box>
                </FormikProvider>
            </Paper>

            {/* Bottom Rectangle Image */}
            <div className="bird-container bird-container--one"><div className="bird bird--one">&nbsp;</div></div>
            <div className="bird-container bird-container--two"><div className="bird bird--two">&nbsp;</div></div>
            <div className="bird-container bird-container--three"><div className="bird bird--two">&nbsp;</div></div>
            <div className="bird-container bird-container--four"><div className="bird bird--two">&nbsp;</div></div>
        </Box>
    );
}
