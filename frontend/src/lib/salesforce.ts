// Salesforce-klient — autentisering och API-anrop via jsforce

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsforceConnection = any;

import jsforce from 'jsforce';

let conn: JsforceConnection | null = null;

export async function getConnection(): Promise<JsforceConnection> {
  if (conn?.accessToken) {
    return conn;
  }

  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const securityToken = process.env.SF_SECURITY_TOKEN;

  conn = new jsforce.Connection({
    oauth2: {
      loginUrl,
      clientId,
      clientSecret,
    },
  });

  if (username && password) {
    // Username/password flow (med security token)
    const fullPassword = securityToken ? `${password}${securityToken}` : password;
    await conn.login(username, fullPassword);
  } else if (clientId && clientSecret) {
    // Client credentials flow för gäst-API
    // För production: använd JWT Bearer flow istället
    console.warn('Använder client credentials — överväg JWT för produktion');
  } else {
    throw new Error(
      'Salesforce credentials saknas. Sätt SF_CLIENT_ID, SF_CLIENT_SECRET och antingen SF_USERNAME/SF_PASSWORD/SF_SECURITY_TOKEN.'
    );
  }

  return conn;
}

/**
 * SOQL query wrapper
 */
export async function query(soql: string): Promise<Record<string, unknown>[]> {
  const conn = await getConnection();
  const result = await conn.query(soql);
  return result.records as Record<string, unknown>[];
}

/**
 * Skapa ett Salesforce-objekt
 */
export async function create(objectName: string, data: Record<string, unknown>): Promise<{ id: string }> {
  const conn = await getConnection();
  const result = await conn.sobject(objectName).create(data);
  return { id: result.id };
}

/**
 * Kontrollera tillgänglighet för en produkttyp mellan datum
 */
export async function checkAvailability(
  productId: string,
  startDate: string,
  endDate: string
): Promise<{ availableCount: number; assets: Array<{ id: string; name: string; serialNumber: string }> }> {
  // Hitta assets av rätt produkttyp som inte är bokade under perioden
  const soql = `
    SELECT Id, Name, SerialNumber, Status
    FROM Asset
    WHERE Product2Id = '${productId}'
      AND Status = 'Tillgänglig'
      AND Id NOT IN (
        SELECT Asset__c
        FROM Booking_Slot__c
        WHERE StartDateTime__c < ${endDate}T23:59:59Z
          AND EndDateTime__c > ${startDate}T00:00:00Z
          AND Status__c NOT IN ('Avbokad', 'Återlämnad')
      )
  `;

  const assets = await query(soql) as Array<{
    Id: string;
    Name: string;
    SerialNumber: string;
  }>;

  return {
    availableCount: assets.length,
    assets: assets.map((a) => ({
      id: a.Id,
      name: a.Name,
      serialNumber: a.SerialNumber,
    })),
  };
}

/**
 * Hämta produkter av en viss family
 */
export async function getProducts(family?: string): Promise<
  Array<{
    id: string;
    name: string;
    productCode: string;
    family: string;
    description: string;
    pricePerDay: number;
  }>
> {
  let where = '';
  if (family) {
    where = `WHERE Family = '${family}'`;
  }

  const soql = `
    SELECT Id, Name, ProductCode, Family, Description,
           (SELECT UnitPrice FROM PricebookEntries WHERE Pricebook2.IsStandard = true LIMIT 1)
    FROM Product2
    ${where}
    AND IsActive = true
    ORDER BY Family, Name
  `;

  const products = await query(soql) as Array<{
    Id: string;
    Name: string;
    ProductCode: string;
    Family: string;
    Description: string;
    PricebookEntries?: { records: Array<{ UnitPrice: number }> };
  }>;

  return products.map((p) => ({
    id: p.Id,
    name: p.Name,
    productCode: p.ProductCode,
    family: p.Family,
    description: p.Description || '',
    pricePerDay: p.PricebookEntries?.records?.[0]?.UnitPrice || 0,
  }));
}

/**
 * Skapa en komplett bokning
 */
export async function createBooking(params: {
  productId: string;
  assetId: string;
  startDate: string;
  endDate: string;
  addons: Array<{ productId: string; quantity: number; unitPrice: number }>;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  deliveryAddress: {
    street: string;
    postalCode: string;
    city: string;
  };
  deliveryNotes?: string;
  totalPrice: number;
}): Promise<{
  bookingId: string;
  opportunityId: string;
  bookingSlotId: string;
}> {
  const conn = await getConnection();

  const fullAddress = `${params.deliveryAddress.street}, ${params.deliveryAddress.postalCode} ${params.deliveryAddress.city}`;

  // 1. Hitta eller skapa Account
  let accountId: string;
  const existingAccounts = await conn.query(
    `SELECT Id FROM Account WHERE Name = '${params.customer.firstName} ${params.customer.lastName}' LIMIT 1`
  ) as { records: Array<{ Id: string }> };
  if (existingAccounts.records.length > 0) {
    accountId = existingAccounts.records[0].Id;
  } else {
    const account = await conn.sobject('Account').create({
      Name: `${params.customer.firstName} ${params.customer.lastName}`,
      Phone: params.customer.phone,
      BillingStreet: params.deliveryAddress.street,
      BillingPostalCode: params.deliveryAddress.postalCode,
      BillingCity: params.deliveryAddress.city,
    });
    accountId = account.id;
  }

  // 2. Skapa Contact
  const contact = await conn.sobject('Contact').create({
    AccountId: accountId,
    FirstName: params.customer.firstName,
    LastName: params.customer.lastName,
    Email: params.customer.email,
    Phone: params.customer.phone,
  });

  // 3. Beräkna antal dagar
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // 4. Skapa Opportunity
  const opportunity = await conn.sobject('Opportunity').create({
    Name: `Bokning — ${params.customer.firstName} ${params.customer.lastName}`,
    AccountId: accountId,
    ContactId: contact.id,
    StageName: 'Bokad',
    CloseDate: end.toISOString().split('T')[0],
    Amount: params.totalPrice,
    LeadSource: 'Webb',
    Description: `Bokning: ${start.toLocaleDateString('sv-SE')} — ${end.toLocaleDateString('sv-SE')} (${days} dagar)\nAdress: ${fullAddress}\n${params.deliveryNotes || ''}`,
  });

  // 5. Skapa OpportunityLineItems (toalett + tillval via standard PricebookEntry)
  try {
    const pricebookEntry = await conn.query(
      `SELECT Id FROM PricebookEntry WHERE Product2Id = '${params.productId}' AND Pricebook2.IsStandard = true LIMIT 1`
    ) as { records: Array<{ Id: string }> };
    if (pricebookEntry.records.length > 0) {
      await conn.sobject('OpportunityLineItem').create({
        OpportunityId: opportunity.id,
        PricebookEntryId: pricebookEntry.records[0].Id,
        Quantity: days,
        UnitPrice: params.totalPrice / days,
      });
    }
  } catch (e) {
    console.warn('Kunde inte skapa OpportunityLineItem:', e);
  }

  // 6. Skapa Booking_Slot__c
  const bookingSlot = await conn.sobject('Booking_Slot__c').create({
    Asset__c: params.assetId,
    Opportunity__c: opportunity.id,
    Contact__c: contact.id,
    StartDateTime__c: `${params.startDate}T00:00:00`,
    EndDateTime__c: `${params.endDate}T23:59:59`,
    Status__c: 'Bokad',
    DeliveryAddress__c: fullAddress,
    DeliveryNotes__c: params.deliveryNotes || '',
    TotalPrice__c: params.totalPrice,
  });

  // 7. Uppdatera Asset-status
  await conn.sobject('Asset').update({
    Id: params.assetId,
    Status: 'Bokad',
  });

  return {
    bookingId: `BOOK-${bookingSlot.id.slice(-8).toUpperCase()}`,
    opportunityId: opportunity.id,
    bookingSlotId: bookingSlot.id,
  };
}
