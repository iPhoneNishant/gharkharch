#!/bin/bash

# Script to set Cloud Functions permissions to allow unauthenticated invocations
# This is a workaround for React Native auth token passing issues

PROJECT_ID="gharkharch-d36dc"
REGION="us-central1"
FUNCTIONS=("createAccount" "updateAccount" "deleteAccount" "createTransaction" "updateTransaction" "deleteTransaction")

echo "Setting Cloud Functions permissions..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

for func in "${FUNCTIONS[@]}"; do
  echo "Setting permissions for $func..."
  
  # Use gcloud if available, otherwise provide manual instructions
  if command -v gcloud &> /dev/null; then
    gcloud functions add-iam-policy-binding ${func} \
      --region=${REGION} \
      --member=allUsers \
      --role=roles/cloudfunctions.invoker \
      --project=${PROJECT_ID} 2>&1
    
    if [ $? -eq 0 ]; then
      echo "✓ $func permissions set"
    else
      echo "✗ Failed to set permissions for $func"
    fi
  else
    echo "⚠ gcloud CLI not found. Please set permissions manually:"
    echo "  1. Go to: https://console.cloud.google.com/functions"
    echo "  2. Select function: $func"
    echo "  3. Go to Permissions tab"
    echo "  4. Add Principal: allUsers"
    echo "  5. Role: Cloud Functions Invoker"
    echo ""
  fi
done

echo ""
echo "Note: Functions will still verify auth tokens manually in code for security."
