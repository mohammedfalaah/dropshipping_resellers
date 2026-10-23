import React from "react";
import Breadcrumb from "../components/Breadcrumb";

export default function DeliveryPolicy() {
  return (
    <>
      <Breadcrumb title="Delivery & Shipping Policy" links={[{ label: "Shipping Policy" }]} />

      <div className="policy-page py-5">
        <div className="container" style={{ maxWidth: "860px" }}>
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border" style={{ lineHeight: "1.8" }}>
            <h3 className="fw-bold mb-4">Shipping Methods & Delivery Times</h3>
            <p className="text-muted mb-4">
              We pack orders with sustainable honeycomb paper and climate-neutral packaging. Orders placed before 2 PM EST are dispatched on the same business day.
            </p>

            <div className="table-responsive mb-4">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Shipping Speed</th>
                    <th>Transit Time</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  <tr>
                    <td>Standard Shipping</td>
                    <td>3 – 5 Business Days</td>
                    <td>$5.99 (Free on orders $50+)</td>
                  </tr>
                  <tr>
                    <td>Expedited Courier</td>
                    <td>2 Business Days</td>
                    <td>$12.99</td>
                  </tr>
                  <tr>
                    <td>Next Day Air</td>
                    <td>1 Business Day</td>
                    <td>$24.99</td>
                  </tr>
                  <tr>
                    <td>International Express</td>
                    <td>7 – 12 Business Days</td>
                    <td>Calculated at checkout</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="fw-bold mb-4">Order Tracking</h3>
            <p className="text-muted mb-0">
              Upon shipment, an automatic dispatch notification containing a live tracking link from our carrier partner will be sent directly to your registered email address.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
