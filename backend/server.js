require('dotenv').config();
const express = require("express");
const { ReclaimProofRequest, verifyProof } = require("@reclaimprotocol/js-sdk");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));

app.get("/reclaim/generate-config", async (req, res) => {
  const APP_ID = process.env.REACT_APP_ID;
  const APP_SECRET = process.env.REACT_APP_SECRET;
  const PROVIDER_ID = process.env.REACT_APP_PROVIDER_ID;

  if (!APP_ID || !APP_SECRET || !PROVIDER_ID) {
    console.error("Error: Missing one or more environment variables (REACT_APP_ID, REACT_APP_SECRET, REACT_APP_PROVIDER_ID)");
    return res.status(500).json({ error: "Server configuration error: Missing required environment variables." });
  }

  try {
    const reclaimProofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);
    reclaimProofRequest.setAppCallbackUrl(`http://localhost:${port}/receive-proofs`);
    const reclaimProofRequestConfig = reclaimProofRequest.toString();
    return res.json({ reclaimProofRequestConfig });
  } catch (error) {
    console.error("Error generating request config:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return res.status(500).json({ error: "Failed to generate request config", details: error.message });
  }
});

app.post("/receive-proofs", async (req, res) => {
  try {
    const proof = JSON.parse(req.body);
    console.log("Received proof object for verification (DEBUGGING - SKIPPING ACTUAL VERIFICATION):", JSON.stringify(proof, null, 2));

    // const isProofValid = await verifyProof(proof); // DEBUG: Temporarily skip actual verification
    const isProofValid = true; // DEBUG: Assume valid to test frontend flow
    console.log(`DEBUG: verifyProof() was bypassed. isProofValid is set to: ${isProofValid}`);

    if (isProofValid) {
      console.log("Proof assumed valid for debugging purposes.");
      return res.status(200).json({ status: "success", message: "Proof assumed valid (DEBUGGING)", proofData: proof });
    } else {
      console.error("Proof verification failed (this path should not be hit with debug bypass).");
      return res.status(400).json({ status: "failure", error: "Invalid proof data (debug error path)" });
    }
  } catch (error) {
    console.error("Error processing/verifying proof (DEBUGGING):", error);
    if (error instanceof SyntaxError) {
        return res.status(400).json({ status: "failure", error: "Invalid JSON format in request body for /receive-proofs (DEBUGGING)" });
    }
    return res.status(500).json({ status: "failure", error: "Failed to process proof (DEBUGGING)" });
  }
});

app.post("/submit-user-info", async (req, res) => {
  try {
    const { userInfo, proof } = req.body;
    if (!userInfo || !proof) {
      return res.status(400).json({ status: "failure", error: "Missing userInfo or proof data in request body." });
    }
    console.log("Received User Info:", JSON.stringify(userInfo, null, 2));
    console.log("Received Proof along with User Info:", JSON.stringify(proof, null, 2));
    // Actual verification and DB saving would go here in production
    return res.status(200).json({ status: "success", message: "User information and proof received successfully." });
  } catch (error) {
    console.error("Error processing /submit-user-info:", error);
    return res.status(500).json({ status: "failure", error: "Failed to process user information and proof." });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`QR Config Endpoint: http://localhost:${port}/reclaim/generate-config`);
  console.log(`Receive Proofs Endpoint: http://localhost:${port}/receive-proofs (POST, DEBUGGING: Proof verification bypassed)`);
  console.log(`Submit User Info Endpoint: http://localhost:${port}/submit-user-info (POST)`);
  if (!process.env.REACT_APP_ID || !process.env.REACT_APP_SECRET || !process.env.REACT_APP_PROVIDER_ID) {
    console.warn("Warning: One or more Reclaim environment variables (REACT_APP_ID, REACT_APP_SECRET, REACT_APP_PROVIDER_ID) are not set. The /reclaim/generate-config endpoint might fail.");
  }
});
