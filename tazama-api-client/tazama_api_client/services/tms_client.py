"""
TMS Client - Centralized API calls to Tazama TMS Service
"""
import requests
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from config  import TMS_BASE_URL, TMS_ENDPOINTS, SOURCE_TENANT_ID, REQUEST_TIMEOUT

class TMSClient:
    """Client for interacting with Tazama TMS Service"""
    
    def __init__(self):
        self.base_url = TMS_BASE_URL
        self.endpoints = TMS_ENDPOINTS
        self.tenant_id = SOURCE_TENANT_ID
        self.timeout = REQUEST_TIMEOUT
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "SourceTenantId": self.tenant_id
        }
    
    def check_health(self) -> Dict[str, Any]:
        """Check TMS service health"""
        try:
            response = requests.get(
                f"{self.base_url}{self.endpoints['health']}",
                timeout=5
            )
            return {
                "status": "success",
                "tms_status": response.json(),
                "response_time_ms": response.elapsed.total_seconds() * 1000,
                "http_code": response.status_code
            }
        except requests.exceptions.ConnectionError:
            return {
                "status": "error",
                "message": "Cannot connect to TMS service. Is it running?",
                "tms_url": self.base_url
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def send_pacs008(self, payload: dict) -> Tuple[int, float, Any]:
        """
        Send pacs.008 payment request
        Returns: (status_code, response_time_ms, response_data)
        """
        start_time = datetime.now()
        try:
            response = requests.post(
                f"{self.base_url}{self.endpoints['pacs008']}",
                json=payload,
                headers=self._get_headers(),
                timeout=self.timeout
            )
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                return response.status_code, response_time, response.json()
            else:
                return response.status_code, response_time, response.text
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            return 0, response_time, str(e)
    
    def send_pacs002(self, payload: dict) -> Tuple[int, float, Any]:
        """
        Send pacs.002 confirmation
        Returns: (status_code, response_time_ms, response_data)
        """
        start_time = datetime.now()
        try:
            response = requests.post(
                f"{self.base_url}{self.endpoints['pacs002']}",
                json=payload,
                headers=self._get_headers(),
                timeout=self.timeout
            )
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                return response.status_code, response_time, response.json()
            else:
                return response.status_code, response_time, response.text
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            return 0, response_time, str(e)
    
    def send_pain001(self, payload: dict) -> Tuple[int, float, Any]:
        """
        Send pain.001 Customer Credit Transfer Initiation
        Returns: (status_code, response_time_ms, response_data)
        """
        start_time = datetime.now()
        try:
            response = requests.post(
                f"{self.base_url}{self.endpoints['pain001']}",
                json=payload,
                headers=self._get_headers(),
                timeout=self.timeout
            )
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                return response.status_code, response_time, response.json()
            else:
                return response.status_code, response_time, response.text
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            return 0, response_time, str(e)
    
    def send_pain013(self, payload: dict) -> Tuple[int, float, Any]:
        """
        Send pain.013 Creditor Payment Activation Request
        Returns: (status_code, response_time_ms, response_data)
        """
        start_time = datetime.now()
        try:
            response = requests.post(
                f"{self.base_url}{self.endpoints['pain013']}",
                json=payload,
                headers=self._get_headers(),
                timeout=self.timeout
            )
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                return response.status_code, response_time, response.json()
            else:
                return response.status_code, response_time, response.text
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            return 0, response_time, str(e)
    
    def send_transaction(self, payload: dict) -> Dict[str, Any]:
        """
        Send generic transaction (detects type from TxTp field)
        Used for Rule 903 geo-location testing
        Returns: response dict
        """
        tx_type = payload.get("TxTp", "")
        
        # Route to appropriate endpoint based on TxTp
        if "pain.001" in tx_type:
            status_code, response_time, data = self.send_pain001(payload)
        elif "pacs.008" in tx_type:
            status_code, response_time, data = self.send_pacs008(payload)
        elif "pacs.002" in tx_type:
            status_code, response_time, data = self.send_pacs002(payload)
        elif "pain.013" in tx_type:
            status_code, response_time, data = self.send_pain013(payload)
        else:
            # Check if it has CstmrCdtTrfInitn (pain.001 structure)
            if "CstmrCdtTrfInitn" in payload:
                status_code, response_time, data = self.send_pain001(payload)
            elif "FIToFICstmrCdtTrf" in payload:
                status_code, response_time, data = self.send_pacs008(payload)
            else:
                # Default to pacs.008
                status_code, response_time, data = self.send_pacs008(payload)
        
        return {
            "status_code": status_code,
            "response_time_ms": response_time,
            "data": data,
            "tx_type": tx_type or "auto-detected"
        }


# Singleton instance
tms_client = TMSClient()
