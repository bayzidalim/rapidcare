import { Transaction, PaymentReceipt } from './types';

export const generateReceiptData = (transaction: Transaction): PaymentReceipt => {
  return {
    receiptId: `RCP-${transaction.transactionId}`,
    transactionId: transaction.transactionId,
    bookingId: transaction.bookingId,
    patientName: transaction.patientName,
    hospitalName: transaction.hospitalName,
    resourceType: transaction.resourceType,
    scheduledDate: transaction.scheduledDate,
    amount: transaction.amount,
    serviceCharge: transaction.serviceCharge,
    hospitalAmount: transaction.hospitalAmount,
    paymentMethod: transaction.paymentMethod,
    paymentDate: transaction.processedAt || transaction.createdAt,
    status: transaction.status,
    receiptDate: new Date().toISOString(),
    rapidAssistance: transaction.rapidAssistance,
    rapidAssistanceCharge: transaction.rapidAssistanceCharge,
    rapidAssistantName: transaction.rapidAssistantName,
    rapidAssistantPhone: transaction.rapidAssistantPhone
  };
};

export const formatReceiptForPrint = (receipt: PaymentReceipt): string => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
INSTANT HOSPITALIZATION PLATFORM
Payment Receipt

Receipt ID: ${receipt.receiptId}
Transaction ID: ${receipt.transactionId}
Receipt Date: ${formatDate(receipt.receiptDate)}

BOOKING DETAILS
Patient Name: ${receipt.patientName || 'N/A'}
Hospital: ${receipt.hospitalName || 'N/A'}
Resource Type: ${receipt.resourceType ? receipt.resourceType.charAt(0).toUpperCase() + receipt.resourceType.slice(1) : 'N/A'}
Scheduled Date: ${receipt.scheduledDate ? formatDate(receipt.scheduledDate) : 'N/A'}

PAYMENT DETAILS
Payment Method: ${receipt.paymentMethod.replace('_', ' ').toUpperCase()}
Payment Date: ${receipt.paymentDate ? formatDate(receipt.paymentDate) : 'N/A'}
Payment Status: ${receipt.status.toUpperCase()}

AMOUNT BREAKDOWN
Hospital Amount: ${formatCurrency(receipt.hospitalAmount)}
Service Charge: ${formatCurrency(receipt.serviceCharge)}${receipt.rapidAssistance && receipt.rapidAssistanceCharge ? `
Rapid Assistance: ${formatCurrency(receipt.rapidAssistanceCharge)}` : ''}
Total Amount: ${formatCurrency(receipt.amount)}${receipt.rapidAssistance ? `

RAPID ASSISTANCE SERVICE
Service: Dedicated escort from hospital gate to destination
${receipt.rapidAssistantName ? `Assistant: ${receipt.rapidAssistantName}` : 'Assistant: Details will be provided shortly'}
${receipt.rapidAssistantPhone ? `Contact: ${receipt.rapidAssistantPhone}` : 'Contact: Will be provided via SMS'}` : ''}

Thank you for using Instant Hospitalization Platform!
For support, contact us at support@instanthospitalization.com
  `.trim();
};

export const downloadReceiptAsPDF = async (receipt: PaymentReceipt): Promise<void> => {
  // For now, we'll create a simple text-based receipt
  // In a real application, you might use a library like jsPDF or html2pdf
  const receiptText = formatReceiptForPrint(receipt);
  
  const blob = new Blob([receiptText], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${receipt.receiptId}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
};

export const downloadReceiptAsHTML = async (receipt: PaymentReceipt): Promise<void> => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - ${receipt.receiptId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 24px;
        }
        .header h2 {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 18px;
            font-weight: normal;
        }
        .section {
            margin-bottom: 25px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .section h3 {
            margin: 0 0 15px 0;
            color: #007bff;
            font-size: 16px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 5px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .detail-label {
            font-weight: bold;
            color: #495057;
        }
        .detail-value {
            color: #212529;
        }
        .amount-breakdown {
            background-color: #e3f2fd;
            border-left: 4px solid #007bff;
        }
        .total-amount {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            border-top: 2px solid #007bff;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #666;
            font-size: 14px;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>INSTANT HOSPITALIZATION</h1>
        <h2>Payment Receipt</h2>
    </div>

    <div class="section">
        <h3>Receipt Information</h3>
        <div class="detail-row">
            <span class="detail-label">Receipt ID:</span>
            <span class="detail-value">${receipt.receiptId}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Transaction ID:</span>
            <span class="detail-value">${receipt.transactionId}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Receipt Date:</span>
            <span class="detail-value">${formatDate(receipt.receiptDate)}</span>
        </div>
    </div>

    <div class="section">
        <h3>Booking Details</h3>
        <div class="detail-row">
            <span class="detail-label">Patient Name:</span>
            <span class="detail-value">${receipt.patientName || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Hospital:</span>
            <span class="detail-value">${receipt.hospitalName || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Resource Type:</span>
            <span class="detail-value">${receipt.resourceType ? receipt.resourceType.charAt(0).toUpperCase() + receipt.resourceType.slice(1) : 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Scheduled Date:</span>
            <span class="detail-value">${receipt.scheduledDate ? formatDate(receipt.scheduledDate) : 'N/A'}</span>
        </div>
    </div>

    <div class="section">
        <h3>Payment Details</h3>
        <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">${receipt.paymentMethod.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payment Date:</span>
            <span class="detail-value">${receipt.paymentDate ? formatDate(receipt.paymentDate) : 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payment Status:</span>
            <span class="detail-value">${receipt.status.toUpperCase()}</span>
        </div>
    </div>

    ${receipt.rapidAssistance ? `
    <div class="section">
        <h3>Rapid Assistance Service</h3>
        <div class="detail-row">
            <span class="detail-label">Service:</span>
            <span class="detail-value">Dedicated escort from hospital gate to destination</span>
        </div>
        ${receipt.rapidAssistantName ? `
        <div class="detail-row">
            <span class="detail-label">Assistant Name:</span>
            <span class="detail-value">${receipt.rapidAssistantName}</span>
        </div>` : ''}
        ${receipt.rapidAssistantPhone ? `
        <div class="detail-row">
            <span class="detail-label">Contact Number:</span>
            <span class="detail-value">${receipt.rapidAssistantPhone}</span>
        </div>` : `
        <div class="detail-row">
            <span class="detail-label">Contact Details:</span>
            <span class="detail-value">Will be provided via SMS shortly</span>
        </div>`}
        ${receipt.rapidAssistanceCharge ? `
        <div class="detail-row">
            <span class="detail-label">Service Charge:</span>
            <span class="detail-value">${formatCurrency(receipt.rapidAssistanceCharge)}</span>
        </div>` : ''}
    </div>` : ''}

    <div class="section amount-breakdown">
        <h3>Amount Breakdown</h3>
        <div class="detail-row">
            <span class="detail-label">Hospital Amount:</span>
            <span class="detail-value">${formatCurrency(receipt.hospitalAmount)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Service Charge:</span>
            <span class="detail-value">${formatCurrency(receipt.serviceCharge)}</span>
        </div>
        ${receipt.rapidAssistance && receipt.rapidAssistanceCharge ? `
        <div class="detail-row">
            <span class="detail-label">Rapid Assistance:</span>
            <span class="detail-value">${formatCurrency(receipt.rapidAssistanceCharge)}</span>
        </div>` : ''}
        <div class="detail-row total-amount">
            <span class="detail-label">Total Amount:</span>
            <span class="detail-value">${formatCurrency(receipt.amount)}</span>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for using Instant Hospitalization Platform!</p>
        <p>For support, contact us at support@instanthospitalization.com</p>
    </div>
</body>
</html>
  `.trim();

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${receipt.receiptId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
};

export const printReceipt = (receipt: PaymentReceipt): void => {
  const receiptWindow = window.open('', '_blank');
  if (!receiptWindow) {
    alert('Please allow popups to print the receipt');
    return;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Payment Receipt - ${receipt.receiptId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INSTANT HOSPITALIZATION</h1>
        <h2>Payment Receipt</h2>
    </div>
    
    <div class="section">
        <h3>Receipt Information</h3>
        <div class="detail-row"><span>Receipt ID:</span><span>${receipt.receiptId}</span></div>
        <div class="detail-row"><span>Transaction ID:</span><span>${receipt.transactionId}</span></div>
        <div class="detail-row"><span>Receipt Date:</span><span>${formatDate(receipt.receiptDate)}</span></div>
    </div>
    
    <div class="section">
        <h3>Booking Details</h3>
        <div class="detail-row"><span>Patient:</span><span>${receipt.patientName || 'N/A'}</span></div>
        <div class="detail-row"><span>Hospital:</span><span>${receipt.hospitalName || 'N/A'}</span></div>
        <div class="detail-row"><span>Resource:</span><span>${receipt.resourceType || 'N/A'}</span></div>
        <div class="detail-row"><span>Scheduled:</span><span>${receipt.scheduledDate ? formatDate(receipt.scheduledDate) : 'N/A'}</span></div>
    </div>
    
    <div class="section">
        <h3>Payment Details</h3>
        <div class="detail-row"><span>Method:</span><span>${receipt.paymentMethod.replace('_', ' ')}</span></div>
        <div class="detail-row"><span>Date:</span><span>${receipt.paymentDate ? formatDate(receipt.paymentDate) : 'N/A'}</span></div>
        <div class="detail-row"><span>Status:</span><span>${receipt.status}</span></div>
    </div>
    
    ${receipt.rapidAssistance ? `
    <div class="section">
        <h3>Rapid Assistance Service</h3>
        <div class="detail-row"><span>Service:</span><span>Escort from gate to destination</span></div>
        ${receipt.rapidAssistantName ? `<div class="detail-row"><span>Assistant:</span><span>${receipt.rapidAssistantName}</span></div>` : ''}
        ${receipt.rapidAssistantPhone ? `<div class="detail-row"><span>Contact:</span><span>${receipt.rapidAssistantPhone}</span></div>` : '<div class="detail-row"><span>Contact:</span><span>Will be provided via SMS</span></div>'}
        ${receipt.rapidAssistanceCharge ? `<div class="detail-row"><span>Charge:</span><span>${formatCurrency(receipt.rapidAssistanceCharge)}</span></div>` : ''}
    </div>` : ''}
    
    <div class="section">
        <h3>Amount Breakdown</h3>
        <div class="detail-row"><span>Hospital Amount:</span><span>${formatCurrency(receipt.hospitalAmount)}</span></div>
        <div class="detail-row"><span>Service Charge:</span><span>${formatCurrency(receipt.serviceCharge)}</span></div>
        ${receipt.rapidAssistance && receipt.rapidAssistanceCharge ? `<div class="detail-row"><span>Rapid Assistance:</span><span>${formatCurrency(receipt.rapidAssistanceCharge)}</span></div>` : ''}
        <div class="detail-row total"><span>Total Amount:</span><span>${formatCurrency(receipt.amount)}</span></div>
    </div>
</body>
</html>
  `;

  receiptWindow.document.write(htmlContent);
  receiptWindow.document.close();
  receiptWindow.print();
  receiptWindow.close();
};