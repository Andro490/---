// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { encrypt, decrypt } from '../utils/crypto';

// const prisma = new PrismaClient();

// interface PaymentCredentials {
//   [key: string]: string;
// }

// export const savePaymentSettings = async (req: Request, res: Response) => {
//   try {
//     const { provider, isActive, credentials } = req.body;

//     if (!provider || typeof isActive !== 'boolean' || !credentials) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     // Encrypt the credentials before saving
//     const encryptedCredentials = encrypt(JSON.stringify(credentials));

//     // If making this provider active, optionally deactivate others if only one can be active
//     if (isActive) {
//       await prisma.paymentGateway.updateMany({
//         where: { isActive: true, provider: { not: provider } },
//         data: { isActive: false },
//       });
//     }

//     const gateway = await prisma.paymentGateway.upsert({
//       where: { provider },
//       update: {
//         isActive,
//         credentials: encryptedCredentials,
//       },
//       create: {
//         provider,
//         isActive,
//         credentials: encryptedCredentials,
//       },
//     });

//     res.status(200).json({ message: 'Payment settings saved successfully', gateway: { ...gateway, credentials: '[ENCRYPTED]' } });
//   } catch (error) {
//     console.error('Error saving payment settings:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// export const getPaymentSettings = async (req: Request, res: Response) => {
//   try {
//     const gateways = await prisma.paymentGateway.findMany();

//     const decryptedGateways = gateways.map((gw) => {
//       let decryptedCreds: PaymentCredentials = {};
//       try {
//         if (typeof gw.credentials === 'string') {
//           decryptedCreds = JSON.parse(decrypt(gw.credentials));
//         }
//       } catch (err) {
//         console.error(`Failed to decrypt credentials for provider ${gw.provider}`);
//       }

//       return {
//         ...gw,
//         credentials: decryptedCreds,
//       };
//     });

//     res.status(200).json(decryptedGateways);
//   } catch (error) {
//     console.error('Error fetching payment settings:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// export const handlePurchase = async (req: Request, res: Response) => {
//   try {
//     const { courseId, userId: bodyUserId } = req.body;
//     // Assuming req.user exists from authMiddleware
//     const userId = bodyUserId || (req as any).user?.userId || (req as any).user?.id;

//     if (!courseId || !userId) {
//       return res.status(400).json({ message: 'courseId and user are required' });
//     }

//     const course = await prisma.course.findUnique({ where: { id: courseId } });
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }

//     // Find the active payment gateway
//     const activeGateway = await prisma.paymentGateway.findFirst({
//       where: { isActive: true },
//     });

//     if (!activeGateway) {
//       return res.status(400).json({ message: 'No active payment gateway found' });
//     }

//     let credentials: PaymentCredentials = {};
//     try {
//       if (typeof activeGateway.credentials === 'string') {
//         credentials = JSON.parse(decrypt(activeGateway.credentials));
//       }
//     } catch (err) {
//       console.error('Decryption failed during purchase');
//       return res.status(500).json({ message: 'Error decrypting payment credentials' });
//     }

//     // Generate a unique transaction ID
//     const transactionId = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

//     // Handle payment logic based on provider
//     let paymentResponse;
//     switch (activeGateway.provider) {
//       case 'FAWRY':
//         const { merchantCode, securityKey } = credentials;
//         // FAWRY specific logic using merchantCode and securityKey
//         console.log(`Processing FAWRY payment for course ${course.title} with merchant ${merchantCode}`);
//         paymentResponse = {
//           provider: 'FAWRY',
//           transactionId,
//           referenceNumber: `FAWRY_${Math.floor(Math.random() * 1000000000)}`, // Fake ref
//           status: 'PENDING_PAYMENT',
//         };
//         break;

//       case 'STRIPE':
//         const { publishableKey, secretKey } = credentials;
//         // STRIPE specific logic
//         console.log(`Processing STRIPE payment for course ${course.title} with secret ${secretKey?.substring(0, 5)}...`);
//         paymentResponse = {
//           provider: 'STRIPE',
//           transactionId,
//           clientSecret: `pi_${Math.random().toString(36).substring(7)}_secret_${Math.random().toString(36).substring(7)}`, // Fake secret
//           status: 'REQUIRES_PAYMENT_METHOD',
//         };
//         break;

//       default:
//         return res.status(400).json({ message: `Unsupported provider: ${activeGateway.provider}` });
//     }

//     // Record the payment in DB
//     const paymentRecord = await prisma.payment.create({
//       data: {
//         userId,
//         courseId,
//         amount: course.price,
//         status: 'PENDING',
//         transactionId,
//       },
//     });

//     res.status(200).json({
//       message: 'Purchase initialized',
//       payment: paymentRecord,
//       gatewayResponse: paymentResponse,
//     });
//   } catch (error) {
//     console.error('Error handling purchase:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/crypto';
import Stripe from 'stripe';

const prisma = new PrismaClient();

interface PaymentCredentials {
  [key: string]: string;
}

export const savePaymentSettings = async (req: Request, res: Response) => {
  try {
    const { provider, isActive, credentials } = req.body;

    if (!provider || typeof isActive !== 'boolean' || !credentials) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    if (isActive) {
      await prisma.paymentGateway.updateMany({
        where: { isActive: true, provider: { not: provider } },
        data: { isActive: false },
      });
    }

    const gateway = await prisma.paymentGateway.upsert({
      where: { provider },
      update: {
        isActive,
        credentials: encryptedCredentials,
      },
      create: {
        provider,
        isActive,
        credentials: encryptedCredentials,
      },
    });

    res.status(200).json({ message: 'Payment settings saved successfully', gateway: { ...gateway, credentials: '[ENCRYPTED]' } });
  } catch (error) {
    console.error('Error saving payment settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPaymentSettings = async (req: Request, res: Response) => {
  try {
    const gateways = await prisma.paymentGateway.findMany();

    const decryptedGateways = gateways.map((gw) => {
      let decryptedCreds: PaymentCredentials = {};
      try {
        if (typeof gw.credentials === 'string') {
          decryptedCreds = JSON.parse(decrypt(gw.credentials));
        }
      } catch (err) {
        console.error(`Failed to decrypt credentials for provider ${gw.provider}`);
      }

      return {
        ...gw,
        credentials: decryptedCreds,
      };
    });

    res.status(200).json(decryptedGateways);
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const handlePurchase = async (req: Request, res: Response) => {
  try {
    const { courseId, userId: bodyUserId } = req.body;
    const userId = bodyUserId || (req as any).user?.userId || (req as any).user?.id;

    if (!courseId || !userId) {
      return res.status(400).json({ message: 'courseId and user are required' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const activeGateway = await prisma.paymentGateway.findFirst({
      where: { isActive: true },
    });

    if (!activeGateway) {
      return res.status(400).json({ message: 'No active payment gateway found' });
    }

    let credentials: PaymentCredentials = {};
    try {
      if (typeof activeGateway.credentials === 'string') {
        credentials = JSON.parse(decrypt(activeGateway.credentials));
      }
    } catch (err) {
      console.error('Decryption failed during purchase');
      return res.status(500).json({ message: 'Error decrypting payment credentials' });
    }

    const transactionId = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let referenceNumber = ''; 

    let paymentResponse;
    switch (activeGateway.provider) {
      case 'FAWRY': {
        // 1. تنظيف شامل باستخدام trim() للمفاتيح الحساسة لمنع المسافات المخفية
        const merchantCode = String(credentials.merchantCode || '').trim();
        const securityKey = String(credentials.securityKey || '').trim();
        
        // 2. رقم مرجعي للتاجر
        const merchantRefNum = `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
        
        // 3. طريقة الدفع
        const paymentMethod = 'PayAtFawry'; 
        
        // 4. تنسيق المبلغ (String صريح بمنزلتين عشريتين للتشفير)
        const amountStr = Number(course.price).toFixed(2).toString();
        
        // 5. ⚠️ الحل النهائي: حذف customerProfileId من معادلة التشفير تماماً
        // لأن هذا الحقل اختياري في فوري، وإدراجه (خاصة إذا كان UUID وليس Integer)
        // يسبب Signature Mismatch لأن فوري تحسب التوقيع بدونه من جانبها
        const rawString = `${merchantCode}${merchantRefNum}${paymentMethod}${amountStr}${securityKey}`;
        
        // 6. طباعة مفصلة للتأكيد
        console.log('--- FAWRY SIGNATURE DEBUG (FINAL) ---');
        console.log(`merchantCode   : "${merchantCode}"`);
        console.log(`merchantRefNum : "${merchantRefNum}"`);
        console.log(`paymentMethod  : "${paymentMethod}"`);
        console.log(`amountStr      : "${amountStr}"`);
        console.log(`securityKey    : "${securityKey.substring(0, 6)}..."`);
        console.log(`rawString      : "${rawString}"`);
        console.log('--------------------------------------');

        // 7. التشفير النهائي
        const signature = require('crypto').createHash('sha256').update(rawString).digest('hex');
        console.log(`signature      : "${signature}"`);

        // جلب بيانات الطالب
        const buyer = await prisma.user.findUnique({ where: { id: userId } });
        const customerName = `${buyer?.firstName || ''} ${buyer?.lastName || buyer?.name || 'Student'}`.trim();
        const customerMobile = buyer?.mobile || '01000000000';
        const customerEmail = buyer?.email || 'student@example.com';

        const paymentExpiry = Date.now() + 48 * 60 * 60 * 1000;
        const webhookBaseUrl = process.env.BACKEND_URL || 'https://your-backend.railway.app';
        const orderWebHookUrl = `${webhookBaseUrl}/api/payments/fawry-webhook`;

        const fawryPayload = {
          merchantCode,
          merchantRefNum,
          // customerProfileId مُحذوف تماماً من الـ payload والتوقيع
          customerName,
          customerMobile,
          customerEmail,
          paymentMethod, // PayAtFawry
          amount: amountStr,
          paymentExpiry,
          currencyCode: 'EGP',
          language: 'ar-eg',
          description: course.title.substring(0, 50),
          orderWebHookUrl,
          chargeItems: [
            {
              itemId: course.id.substring(0, 36),
              description: course.title.substring(0, 50),
              price: amountStr,
              quantity: 1,
            },
          ],
          signature,
        };

        console.log('📤 Fawry Payload:', JSON.stringify(fawryPayload, null, 2));

        try {
          const fawryRes = await fetch('https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fawryPayload),
          });

          const fawryText = await fawryRes.text();
          let fawryData;
          try {
            fawryData = JSON.parse(fawryText);
          } catch (parseError) {
            console.error('❌ Fawry returned non-JSON response:', fawryText);
            return res.status(500).json({ message: 'فوري أرجع استجابة غير صالحة' });
          }

          console.log('📥 Fawry Response Payload:', fawryData);

          if (fawryData.statusCode !== 200) {
            const errDesc = fawryData.statusDescription || 'خطأ غير محدد';
            console.error(`❌ Fawry Error [${fawryData.statusCode}]:`, errDesc);
            return res.status(400).json({
              message: `فشل طلب فوري: ${errDesc} (Code: ${fawryData.statusCode})`,
              details: fawryData
            });
          }

          // رقم مرجعي فوري الفعلي (referenceNumber) - يعرضه الطالب لدفعه في الفرع
          referenceNumber = String(fawryData.referenceNumber || merchantRefNum);

        } catch (fawryError: any) {
          console.error('🚨 Fawry Network Error:', fawryError.message);
          return res.status(500).json({ message: 'حدث خطأ أثناء الاتصال ببوابة فوري' });
        }

        paymentResponse = {
          provider: 'FAWRY',
          transactionId,
          referenceNumber,
          status: 'PENDING_PAYMENT',
        };
        break;
      }

      case 'STRIPE': {
        const { secretKey } = credentials;
        console.log(`Processing STRIPE payment for course ${course.title}...`);

        if (!secretKey) {
            return res.status(500).json({ message: 'Stripe Secret Key is missing in settings' });
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' as any });

        // Frontend URL for redirecting after payment (Dynamic based on request origin)
        const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'https://portofa.vercel.app';

        try {
            // Create Stripe Checkout Session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd', // Modify this to the currency you need
                            product_data: {
                                name: course.title,
                                description: course.description?.substring(0, 200) || 'Course Enrollment',
                            },
                            unit_amount: Math.round(course.price * 100), // Stripe expects amounts in cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${frontendUrl}/checkout/${course.id}?session_id={CHECKOUT_SESSION_ID}&success=true`,
                cancel_url: `${frontendUrl}/checkout/${course.id}?canceled=true`,
                client_reference_id: userId,
                metadata: {
                    courseId: course.id,
                    userId: userId,
                    transactionId,
                },
            });

            referenceNumber = session.id;

            paymentResponse = {
                provider: 'STRIPE',
                transactionId,
                referenceNumber,
                checkoutUrl: session.url, // Send the URL to frontend for redirection
                status: 'REQUIRES_PAYMENT_METHOD',
            };
        } catch (stripeError: any) {
            console.error('🚨 Stripe Error:', stripeError.message);
            return res.status(500).json({ message: 'حدث خطأ أثناء الاتصال ببوابة Stripe' });
        }
        break;
      }

      default:
        return res.status(400).json({ message: `Unsupported provider: ${activeGateway.provider}` });
    }

    // تسجل المعاملة في الـ DB بوضع PENDING ورقم المعاملة الفوري في خانة الـ merchantRefNum أو الـ transactionId
    const paymentRecord = await prisma.payment.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        status: 'PENDING',
        transactionId: referenceNumber || transactionId, // بنسجل الرقم المرجعي هنا للبحث عنه لاحقاً
      },
    });

    res.status(200).json({
      message: 'Purchase initialized',
      payment: paymentRecord,
      gatewayResponse: paymentResponse,
    });
  } catch (error) {
    console.error('Error handling purchase:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 👇 الدالة الجديدة الخاصة بالـ Webhook اللي بتستقبل تأكيد الدفع من فوري
export const handleFawryWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body as any;
    const {
      merchantRefNumber,
      orderStatus,
      referenceNumber,
      paymentAmount,
      orderAmount,
      paymentMethod,
      fawryFees,
      authNumber,
      customerMail,
      customerMobile,
      signature: fawrySignature,
    } = body;

    console.log(`⚙️ Fawry Webhook | Ref: ${merchantRefNumber} | Status: ${orderStatus}`);

    // 1. التحقق من توقيع فوري وفق الدوكس الرسمي
    const gateway = await prisma.paymentGateway.findFirst({ where: { isActive: true } });
    if (gateway) {
      let creds: any = {};
      try {
        creds = typeof gateway.credentials === 'string'
          ? JSON.parse(decrypt(gateway.credentials))
          : gateway.credentials;
      } catch (err) {
        console.error('Failed to decrypt gateway credentials in webhook');
      }

      const secureKey = creds.securityKey || '';
      // معادلة التحقق: referenceNumber + merchantRefNumber + paymentAmount(xx.xx) + orderAmount(xx.xx) + orderStatus + paymentMethod + fawryFees(xx.xx) + secureKey
      const feeStr = fawryFees ? Number(fawryFees).toFixed(2) : '';
      const authStr = authNumber ? String(authNumber) : '';
      const mailStr = customerMail || '';
      const mobileStr = customerMobile || '';
      const verifyRaw = [
        referenceNumber ? String(referenceNumber) : '',
        merchantRefNumber,
        Number(paymentAmount).toFixed(2),
        Number(orderAmount).toFixed(2),
        orderStatus,
        paymentMethod,
        feeStr,
        authStr,
        mailStr,
        mobileStr,
        secureKey,
      ].join('');

      const expectedSig = require('crypto').createHash('sha256').update(verifyRaw).digest('hex');

      if (fawrySignature && fawrySignature !== expectedSig) {
        console.error('🚫 Invalid Fawry Webhook Signature!');
        return res.status(401).send('Invalid signature');
      }
    }

    // 2. ابحث عن المعاملة بالرقم المرجعي للتاجر
    const payment = await prisma.payment.findFirst({
      where: { transactionId: merchantRefNumber, status: 'PENDING' },
    });

    if (!payment) {
      console.warn(`⚠️ Payment not found or already processed: ${merchantRefNumber}`);
      return res.status(200).send('OK'); // نرد 200 لفوري حتى ما يعيد الارسال
    }

    // 3. إذا فوري أكد الدفع بنجاح
    if (orderStatus === 'PAID') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS' },
      });

      // تجنب التسجيل المزدوج
      const existing = await prisma.enrollment.findFirst({
        where: { userId: payment.userId, courseId: payment.courseId },
      });
      if (!existing) {
        await prisma.enrollment.create({
          data: { userId: payment.userId, courseId: payment.courseId },
        });
      }

      console.log(`✅ Course unlocked for User: ${payment.userId} | Ref: ${merchantRefNumber}`);
    } else if (orderStatus === 'EXPIRED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      console.log(`⏰ Payment expired: ${merchantRefNumber}`);
    }

    // فوري تتوقع 200 OK بدون body خاص
    return res.status(200).send('OK');
  } catch (error) {
    console.error('🚨 Webhook Error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

// 👇 الدالة الخاصة بالـ Webhook لـ Stripe
export const handleStripeWebhook = async (req: Request, res: Response) => {
    // 1. Get the signature from headers
    const sig = req.headers['stripe-signature'];
  
    if (!sig) {
        return res.status(400).send('Webhook Error: Missing stripe-signature header');
    }
  
    // 2. We need the raw body which is provided by express.raw() in server.ts
    const payload = req.body;
  
    try {
        // Fetch the active gateway to get the Webhook Secret
        const gateway = await prisma.paymentGateway.findFirst({ where: { provider: 'STRIPE', isActive: true } });
        if (!gateway) {
            return res.status(400).send('Webhook Error: Stripe is not configured or not active');
        }
  
        let creds: any = {};
        if (typeof gateway.credentials === 'string') {
            creds = JSON.parse(decrypt(gateway.credentials));
        } else {
            creds = gateway.credentials;
        }
  
        const webhookSecret = creds.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
        const secretKey = creds.secretKey;
  
        if (!webhookSecret || !secretKey) {
            return res.status(400).send('Webhook Error: Webhook secret or Secret Key not found in settings');
        }
  
        const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' as any });
        
        let event;
        try {
            // Verify signature
            event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
        } catch (err: any) {
            console.error(`⚠️ Stripe Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
  
        // 3. Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const courseId = session.metadata?.courseId;
            const userId = session.metadata?.userId;
            const transactionId = session.metadata?.transactionId;
  
            console.log(`💰 Stripe Payment Success! User: ${userId}, Course: ${courseId}`);
  
            if (userId && courseId && transactionId) {
                // Update payment record
                const payment = await prisma.payment.findFirst({
                    where: { transactionId },
                });
  
                if (payment) {
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 'SUCCESS' },
                    });
  
                    // Enroll the student
                    const existingEnrollment = await prisma.enrollment.findFirst({
                        where: { userId, courseId },
                    });
  
                    if (!existingEnrollment) {
                        await prisma.enrollment.create({
                            data: { userId, courseId },
                        });
                        console.log(`✅ Course unlocked successfully via Stripe`);
                    }
                }
            }
        }
  
        // 4. Return a 200 response to acknowledge receipt of the event
        res.json({ received: true });
    } catch (error) {
        console.error('🚨 Stripe Webhook Server Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;

    if (!txnId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const payment = await prisma.payment.findFirst({
      where: { transactionId: txnId },
      select: { status: true },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    return res.status(200).json({ status: payment.status });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyStripeSession = async (req: Request, res: Response) => {
  try {
      const { sessionId } = req.body;
      if (!sessionId) {
          return res.status(400).json({ message: 'Session ID is required' });
      }

      const gateway = await prisma.paymentGateway.findFirst({ where: { provider: 'STRIPE', isActive: true } });
      if (!gateway) return res.status(400).json({ message: 'Stripe gateway not active' });

      let creds: any = {};
      if (typeof gateway.credentials === 'string') {
          creds = JSON.parse(decrypt(gateway.credentials));
      } else {
          creds = gateway.credentials;
      }
      
      const secretKey = creds.secretKey;
      if (!secretKey) return res.status(500).json({ message: 'Stripe Secret Key missing' });

      const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' as any });

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
          const courseId = session.metadata?.courseId;
          const userId = session.metadata?.userId;
          const transactionId = session.metadata?.transactionId;

          if (userId && courseId && transactionId) {
              const payment = await prisma.payment.findFirst({ where: { transactionId } });
              if (payment) {
                  await prisma.payment.update({
                      where: { id: payment.id },
                      data: { status: 'SUCCESS' },
                  });

                  const existingEnrollment = await prisma.enrollment.findFirst({
                      where: { userId, courseId },
                  });

                  if (!existingEnrollment) {
                      await prisma.enrollment.create({
                          data: { userId, courseId },
                      });
                  }
              }
              return res.status(200).json({ success: true, message: 'Payment verified and course unlocked' });
          }
      }

      return res.status(400).json({ success: false, message: 'Payment not completed or invalid metadata' });
  } catch (error) {
      console.error('Error verifying stripe session:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
  }
};