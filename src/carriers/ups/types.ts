export interface UpsAddress {
  AddressLine: string[];
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
}

export interface UpsRateRequestPayload {
  RateRequest: {
    Request: {
      RequestOption: "Shop" | "Rate";
      TransactionReference?: { CustomerContext: string };
    };
    Shipment: {
      Shipper: { Name: string; Address: UpsAddress };
      ShipTo: { Name: string; Address: UpsAddress };
      ShipFrom: { Name: string; Address: UpsAddress };
      PaymentDetails: {
        ShipmentCharge: Array<{ Type: string; BillShipper: { AccountNumber: string } }>;
      };
      Service?: { Code: string; Description: string };
      NumOfPieces: string;
      Package: {
        PackagingType: { Code: string; Description: string };
        Dimensions: {
          UnitOfMeasurement: { Code: string; Description: string };
          Length: string;
          Width: string;
          Height: string;
        };
        PackageWeight: {
          UnitOfMeasurement: { Code: string; Description: string };
          Weight: string;
        };
      };
    };
  };
}

export const UPS_SERVICE_CODES: Record<string, string> = {
  "01": "Next Day Air",
  "02": "2nd Day Air",
  "03": "Ground",
  "07": "Worldwide Express",
  "08": "Worldwide Expedited",
  "11": "Standard",
  "12": "3 Day Select",
  "13": "Next Day Air Saver",
  "14": "Next Day Air Early",
  "54": "Worldwide Express Plus",
  "59": "2nd Day Air A.M.",
  "65": "Saver",
  "71": "Worldwide Express Freight Midday",
  "72": "Worldwide Economy DDP",
  "96": "Worldwide Express Freight",
};

export interface UpsRateResponsePayload {
  RateResponse?: {
    Response?: { ResponseStatus?: { Code?: string; Description?: string } };
    RatedShipment?: Array<{
      Service?: { Code?: string; Description?: string };
      TotalCharge?: { CurrencyCode?: string; MonetaryValue?: string | number };
      BusinessDaysInTransit?: number;
    }>;
  };
}
