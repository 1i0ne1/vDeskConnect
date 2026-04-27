import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Mail, Smartphone } from 'lucide-react';
import '../../style/auth.css';

function VerifyAccount({ userType, email, phone, onBackClick }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [remainingTime, setRemainingTime] = useState(60); // 60 seconds countdown
    const [canResend, setCanResend] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Start countdown for resend code
        if (remainingTime > 0) {
            const timer = setTimeout(() => {
                setRemainingTime(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [remainingTime]);

    const handleChange = (e) => {
        const { value } = e.target;
        // Only allow numbers and limit to 6 digits
        if (/^\d{0,6}$/.test(value)) {
            setVerificationCode(value);
            if (errors.verificationCode) {
                setErrors(prev => ({ ...prev, verificationCode: '' }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate code
        if (!verificationCode || verificationCode.length !== 6) {
            setErrors({ verificationCode: 'Please enter a valid 6-digit code' });
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Simulate API call to verify code
            // In a real application, you would call your backend API here
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For demo purposes, we'll assume the code is correct if it's 123456
            if (verificationCode === '123456') {
                setIsVerified(true);
                
                // In a real app, you would update the user's verification status in your backend
                // and potentially redirect after a delay
            } else {
                setErrors({ verificationCode: 'Invalid verification code. Please try again.' });
            }
        } catch (error) {
            setErrors({ verificationCode: 'An error occurred. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = () => {
        if (canResend) {
            // Simulate resending code
            setRemainingTime(60);
            setCanResend(false);
            // In a real app, you would call your backend API to resend the code
        }
    };

    const handleGoToLogin = () => {
        navigate('/');
    };

    if (isVerified) {
        return (
            <div className="container">
                <div className="card">
                    <div className="card-header">
                        <div className="header-nav">
                            <div className="role-icon verified-icon">
                                <CheckCircle size={20} />
                            </div>
                        </div>
                        <div className="header-content">
                            <h1 className="card-title">Verification in Progress</h1>
                            <p className="card-description">Your account is being verified</p>
                        </div>
                    </div>
                    <div className="card-content">
                        <div className="verification-status">
                            <div className="verification-animation">
                                <div className="pulse-ring"></div>
                                <div className="pulse-ring delay-1"></div>
                                <div className="pulse-ring delay-2"></div>
                                <Clock size={48} className="clock-icon" />
                            </div>
                            <div className="verification-message">
                                <h3>Your account is being verified</h3>
                                <p>Please come back later. You'll be able to access your account once verification is complete.</p>
                            </div>
                            <button 
                                onClick={handleGoToLogin}
                                className="btn btn-primary"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="card">
                <div className="card-header">
                    <div className="header-nav">
                        <button onClick={onBackClick} className="back-btn">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="role-icon">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div className="header-content">
                        <h1 className="card-title">Verify Your Account</h1>
                        <p className="card-description">Enter the verification code sent to you</p>
                    </div>
                </div>
                <div className="card-content">
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label htmlFor="verificationCode" className="label">Verification Code</label>
                            <input
                                type="text"
                                id="verificationCode"
                                name="verificationCode"
                                className={`input ${errors.verificationCode ? 'error' : ''}`}
                                value={verificationCode}
                                onChange={handleChange}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                required
                            />
                            {errors.verificationCode && (
                                <div className="error-message">{errors.verificationCode}</div>
                            )}
                        </div>

                        <div className="verification-info">
                            <p>We've sent a 6-digit verification code to:</p>
                            <div className="contact-methods">
                                {email && (
                                    <div className="contact-method">
                                        <Mail size={16} />
                                        <span>{email}</span>
                                    </div>
                                )}
                                {phone && (
                                    <div className="contact-method">
                                        <Smartphone size={16} />
                                        <span>{phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting || verificationCode.length !== 6}
                        >
                            {isSubmitting ? 'Verifying...' : 'Verify Account'}
                        </button>

                        <div className="resend-code">
                            <p>Didn't receive the code?</p>
                            {canResend ? (
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={handleResendCode}
                                >
                                    Resend code
                                </button>
                            ) : (
                                <p className="countdown">Resend in {remainingTime}s</p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default VerifyAccount;