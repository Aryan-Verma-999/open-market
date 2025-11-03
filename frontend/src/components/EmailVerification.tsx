import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export function EmailVerification() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying')
  const [isResending, setIsResending] = useState(false)
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    } else {
      setStatus('error')
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      // TODO: Implement actual email verification API call
      console.log('Verifying email with token:', verificationToken)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate different responses
      const success = Math.random() > 0.3 // 70% success rate for demo
      
      if (success) {
        setStatus('success')
        toast.success('Email verified successfully!')
      } else {
        setStatus('expired')
      }
    } catch (error) {
      setStatus('error')
      toast.error('Email verification failed.')
    }
  }

  const resendVerification = async () => {
    if (!email) {
      toast.error('Email address not found.')
      return
    }

    setIsResending(true)
    try {
      // TODO: Implement actual resend verification API call
      console.log('Resending verification to:', email)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error) {
      toast.error('Failed to resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your email address has been verified. You can now access all features of your account.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
            >
              Continue to Login
            </button>
          </div>
        )

      case 'expired':
        return (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification link expired</h2>
            <p className="text-gray-600 mb-6">
              The verification link has expired or is invalid. Please request a new verification email.
            </p>
            <div className="space-y-4">
              <button
                onClick={resendVerification}
                disabled={isResending || !email}
                className="btn btn-primary flex items-center justify-center"
              >
                {isResending ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-outline"
              >
                Back to Login
              </button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-600 mb-6">
              We couldn't verify your email address. The link may be invalid or expired.
            </p>
            <div className="space-y-4">
              {email && (
                <button
                  onClick={resendVerification}
                  disabled={isResending}
                  className="btn btn-primary flex items-center justify-center"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => navigate('/register')}
                className="btn btn-outline"
              >
                Back to Registration
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export function EmailVerificationPage() {
  return <EmailVerification />
}