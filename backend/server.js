const express = require("express");
const { ReclaimProofRequest, verifyProof } = require("@reclaimprotocol/js-sdk");
const cors = require("cors"); // Added for Cross-Origin Resource Sharing
const dotenv = require('dotenv').config();

const app = express();
const port = 3000; // Backend server port

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.text({ type: "*/*", limit: "50mb" })); // To parse the urlencoded proof

// Route to generate SDK configuration for the frontend
app.get("/reclaim/generate-config", async (req, res) => {
  // Use environment variables for sensitive information
  const APP_ID = process.env.REACT_APP_ID;
  const APP_SECRET = process.env.REACT_APP_SECRET;
  const PROVIDER_ID = process.env.REACT_APP_PROVIDER_ID;

  try {
    // Initialize with APP_ID, APP_SECRET, and PROVIDER_ID
    const reclaimProofRequest = await ReclaimProofRequest.init(
      APP_ID,
      APP_SECRET,
      PROVIDER_ID
    );

    // Set the callback URL where the Reclaim app will send the proof
    // This should be the /receive-proofs endpoint of this backend server
    reclaimProofRequest.setAppCallbackUrl(`http://localhost:${port}/receive-proofs`);

    // Generate the configuration string to be used by the frontend SDK
    const reclaimProofRequestConfig = reclaimProofRequest.toString();
    
    return res.json({ reclaimProofRequestConfig });
  } catch (error) {
    console.error("Error generating request config:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return res.status(500).json({ error: "Failed to generate request config", details: error.message });
  }
});

// Route to receive and verify proofs from the Reclaim app callback
app.post("/receive-proofs", async (req, res) => {
  try {
    // The proof is sent as URL-encoded JSON in the request body by the Reclaim app
    const decodedBody = decodeURIComponent(req.body);
    const proof = JSON.parse(decodedBody);

    console.log("Received proof object:", JSON.stringify(proof, null, 2));

    // Verify the proof using the SDK's verifyProof function
    // This function checks the signature and integrity of the proof
    const isProofValid = await verifyProof(proof);

    if (isProofValid) {
      console.log("Proof verified successfully.");
      // TODO: Add any additional business logic here based on the proof content
      // For example, check specific parameters within proof.parameters
      return res.status(200).json({ status: "success", message: "Proof verified successfully", proofData: proof });
    } else {
      console.error("Proof verification failed.");
      return res.status(400).json({ status: "failure", error: "Invalid proof data" });
    }
  } catch (error) {
    console.error("Error processing/verifying proof:", error);
    return res.status(500).json({ status: "failure", error: "Failed to process proof" });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`QR Config Endpoint: http://localhost:${port}/reclaim/generate-config`);
  console.log(`Receive Proofs Endpoint: http://localhost:${port}/receive-proofs (POST)`);
});

