import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCourseById, enrollInCourse } from '../features/courses/coursesSlice';
import * as XLSX from 'xlsx';
import { Download, CreditCard, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';


const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentCourse, loading } = useAppSelector((state) => state.courses);
  const { user } = useAppSelector((state) => state.auth);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'SUCCESS' | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const location = useLocation();

  // 2. Check for Stripe redirect params
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const isSuccess = query.get('success');
    const sessionId = query.get('session_id');
    const isCanceled = query.get('canceled');

    const verifyStripePayment = async () => {
      try {
        if (isSuccess && sessionId) {
          setIsProcessing(true);
          const res = await api.post('/payments/verify-stripe', { sessionId });
          if (res.data.success) {
            setPaymentStatus('SUCCESS');
            toast.success('تم الدفع والتسجيل بنجاح!');
            if (id) {
               // Update local state without relying solely on backend enrollment because the backend just enrolled them
               dispatch(enrollInCourse(id)).unwrap().catch(() => {});
            }
          }
        }
      } catch (err) {
         console.error('Error verifying Stripe session:', err);
         toast.error('لم نتمكن من التحقق من الدفع، يرجى التواصل مع الدعم');
      } finally {
         setIsProcessing(false);
      }
    };

    if (isSuccess && sessionId) {
       verifyStripePayment();
    }

    if (isCanceled) {
      toast.error('Payment process was cancelled.');
    }
  }, [location.search, id, dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(fetchCourseById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (paymentStatus === 'PENDING' && referenceNumber) {
      intervalId = setInterval(async () => {
        try {
          const res = await api.get(`/payments/status/${referenceNumber}`);
          if (res.data.status === 'SUCCESS' || res.data.status === 'PAID') {
            setPaymentStatus('SUCCESS');
            toast.success('Payment confirmed successfully! The course has been activated automatically.');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      }, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentStatus, referenceNumber]);

  const generateExcelInvoice = () => {
    if (!currentCourse || !user) return;

    // Create invoice data
    const invoiceData = [
      // 🏷️ WHITE-LABEL: قم بتغيير 'أكاديمية سينما' إلى اسم منصة العميل
      ['Andro Emil - invoice'],
      [],
      ['Invoice number:', `INV-${Math.floor(Math.random() * 1000000)}`],
      ['Date:', new Date().toLocaleDateString('ar-EG')],
      ['Student name:', user.name],
      ['Email:', user.email],
      [],
      ['Payment details'],
      ['Course name', 'Category', 'Price'],
      [
        currentCourse.title,
        currentCourse.category?.name || 'General',
        currentCourse.price === 0 ? 'Free' : `${currentCourse.price} $`
      ],
      [],
      ['Total:', currentCourse.price === 0 ? '0 $' : `${currentCourse.price} $`]
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(invoiceData);
    
    // Set column widths
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];

    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');

    // Generate and download
    XLSX.writeFile(wb, `فاتورة_${currentCourse.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const handlePayment = async () => {
    if (!id) return;
    setIsProcessing(true);

    try {
      if (currentCourse && currentCourse.price > 0) {
        // 1. استدعاء الـ API لتهيئة عملية الدفع مع البوابة المفعلة
        const res = await api.post('/payments/purchase', { courseId: id, userId: user?.id });
        const paymentData = res.data.gatewayResponse;
        const status = res.data.payment.status;

        if (paymentData?.provider === 'STRIPE' && paymentData?.checkoutUrl) {
          // Stripe Redirect
          window.location.href = paymentData.checkoutUrl;
        } else if (status === 'PENDING' || paymentData?.status === 'PENDING_PAYMENT') {
          // Fawry Pending
          setReferenceNumber(paymentData?.referenceNumber || null);
          setPaymentStatus('PENDING');
          toast.success('تم تسجيل الطلب، please complete the payment');
        } else if (status === 'SUCCESS') {
          // If already success somehow
          await dispatch(enrollInCourse(id)).unwrap();
          setPaymentStatus('SUCCESS');
          toast.success('Payment confirmed successfully! The course has been activated automatically.');
        }
      } else {
        // محاكاة سريعة للكورسات المجانية
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await dispatch(enrollInCourse(id)).unwrap();
        setPaymentStatus('SUCCESS');
        toast.success('Payment confirmed successfully! The course has been activated automatically.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Payment failed, please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24 rtl">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8"
      >
        <ArrowRight className="w-5 h-5" />
        Back to course
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Invoice Summary */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-300 dark:border-white/10 shadow-glass">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/5 pb-4">Invoice Summary</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span>Course name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{currentCourse.title}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span>الطالب:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span>التاريخ:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>

          <div className="border-t border-slate-300 dark:border-white/10 pt-6">
            <div className="flex justify-between items-center">
              <span className="text-lg text-slate-700 dark:text-slate-300">Total amount:</span>
              <span className="text-3xl font-extrabold text-theme-neonCyan">
                {currentCourse.price === 0 ? 'Free' : `${currentCourse.price} $`}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Action */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-300 dark:border-white/10 shadow-glass flex flex-col justify-center items-center text-center">
          {paymentStatus === 'SUCCESS' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Payment successful!</h3>
              <p className="text-slate-600 dark:text-slate-400">You have been enrolled in the course and can now download the invoice (Excel) if you wish.</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={generateExcelInvoice}
                  className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-theme-neonCyan/20 text-theme-neonCyan border border-theme-neonCyan/30 font-bold hover:bg-theme-neonCyan hover:text-slate-900 transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  تحميل الفاتورة
                </button>
                <button
                  onClick={() => navigate(`/courses/${id}/play`)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-theme-accent to-theme-neonPurple text-slate-900 dark:text-white font-bold hover:shadow-glow-purple transition-all duration-300"
                >
                  دخول قاعة الدرس
                </button>
              </div>
            </div>
          ) : paymentStatus === 'PENDING' ? (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="w-20 h-20 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment request pending</h3>
              
              {referenceNumber ? (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-300 dark:border-white/10">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Please head to the nearest Fawry outlet and pay using the following reference number to activate the course automatically:</p>
                  <div className="text-3xl font-mono font-bold text-theme-neonCyan tracking-wider bg-theme-neonCyan/10 py-3 rounded-lg border border-theme-neonCyan/30">
                    {referenceNumber}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">Please complete the payment to activate the course.</p>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 mt-2 rounded-xl border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white/5 transition-all duration-300"
              >
                العودة للرئيسية
              </button>
            </div>
          ) : (
            <div className="space-y-6 w-full">
              <div className="w-20 h-20 bg-theme-neonPurple/20 text-theme-neonPurple rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Complete Payment</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Once payment is confirmed, you will be enrolled in the course and an invoice will be issued to you.</p>
              
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-theme-accent via-theme-neonPurple to-theme-neonCyan text-slate-900 dark:text-white font-bold hover:shadow-glow-purple transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
