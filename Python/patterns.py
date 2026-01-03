import pandas as pd
import re
import os
import sys

# --- CONFIGURATION ---
INPUT_FILE = "sorted_file.csv"  # Can be .csv or .xlsx
OUTPUT_FILE = "identified_results.csv"
COLUMN_TO_SEARCH = "SourceFile"     #header name with house bills numbers

import re

# =============================================================================
# COMPREHENSIVE LOGISTICS PATTERN DATABASE
# =============================================================================
# Last Updated: 2026-01-01
# Coverage: Airfreight (MAWB), Ocean (MBL/Container), Forwarders (HBL),
#           NVOCCs, Depots, Container Lessors, Specialized Carriers, Couriers
# =============================================================================

PATTERNS = {
    # =========================================================================
    # 1. AIRFREIGHT CARRIERS (MAWB - Master Air Waybill)
    # =========================================================================
    # Format: 3-digit IATA prefix + 8-digit serial number
    
    # --- APAC Region ---
    "AIR_SINGAPORE":     re.compile(r'\b618[-\s]?\d{8}\b'),  # Singapore Airlines
    "AIR_QANTAS":        re.compile(r'\b081[-\s]?\d{8}\b'),  # Qantas Airways
    "AIR_AIR_NEW_ZEALAND": re.compile(r'\b086[-\s]?\d{8}\b'),  # Air New Zealand
    "AIR_CATHAY":        re.compile(r'\b160[-\s]?\d{8}\b'),  # Cathay Pacific
    "AIR_CHINA_STHN":    re.compile(r'\b784[-\s]?\d{8}\b'),  # China Southern
    "AIR_CHINA_AIR":     re.compile(r'\b297[-\s]?\d{8}\b'),  # Air China
    "AIR_CHINA_EASTERN": re.compile(r'\b781[-\s]?\d{8}\b'),  # China Eastern (Shanghai Hub)
    "AIR_KOREAN":        re.compile(r'\b180[-\s]?\d{8}\b'),  # Korean Air
    "AIR_ASIANA":        re.compile(r'\b988[-\s]?\d{8}\b'),  # Asiana Airlines
    "AIR_EVA":           re.compile(r'\b695[-\s]?\d{8}\b'),  # EVA Air
    "AIR_JAPAN_AIR":     re.compile(r'\b131[-\s]?\d{8}\b'),  # Japan Airlines (JAL)
    "AIR_NIPPON":        re.compile(r'\b205[-\s]?\d{8}\b'),  # All Nippon Airways (ANA)
    "AIR_THAI":          re.compile(r'\b217[-\s]?\d{8}\b'),  # Thai Airways
    "AIR_MALAYSIA":      re.compile(r'\b232[-\s]?\d{8}\b'),  # Malaysia Airlines
    "AIR_GARUDA":        re.compile(r'\b126[-\s]?\d{8}\b'),  # Garuda Indonesia
    "AIR_VIETNAM":       re.compile(r'\b738[-\s]?\d{8}\b'),  # Vietnam Airlines
    "AIR_XIAMEN":        re.compile(r'\b731[-\s]?\d{8}\b'),  # Xiamen Airlines
    "AIR_PHILIPPINES":   re.compile(r'\b079[-\s]?\d{8}\b'),  # Philippine Airlines
    "AIR_CEBU_PACIFIC":  re.compile(r'\b203[-\s]?\d{8}\b'),  # Cebu Pacific Air
    
    # --- Middle East ---
    "AIR_EMIRATES":      re.compile(r'\b176[-\s]?\d{8}\b'),  # Emirates
    "AIR_QATAR":         re.compile(r'\b157[-\s]?\d{8}\b'),  # Qatar Airways
    "AIR_ETIHAD":        re.compile(r'\b607[-\s]?\d{8}\b'),  # Etihad Airways
    "AIR_SAUDIA":        re.compile(r'\b065[-\s]?\d{8}\b'),  # Saudia Cargo
    "AIR_OMAN":          re.compile(r'\b910[-\s]?\d{8}\b'),  # Oman Air
    
    # --- Europe ---
    "AIR_LUFTHANSA":     re.compile(r'\b020[-\s]?\d{8}\b'),  # Lufthansa
    "AIR_BRITISH":       re.compile(r'\b125[-\s]?\d{8}\b'),  # British Airways
    "AIR_AIRFRANCE":     re.compile(r'\b057[-\s]?\d{8}\b'),  # Air France
    "AIR_KLM":           re.compile(r'\b074[-\s]?\d{8}\b'),  # KLM Cargo
    "AIR_TURKISH":       re.compile(r'\b235[-\s]?\d{8}\b'),  # Turkish Airlines
    "AIR_CARGOLUX":      re.compile(r'\b172[-\s]?\d{8}\b'),  # Cargolux
    "AIR_AEROLOGIC":     re.compile(r'\b860[-\s]?\d{8}\b'),  # AeroLogic
    "AIR_AIRBRIDGE":     re.compile(r'\b580[-\s]?\d{8}\b'),  # AirBridgeCargo
    "AIR_SAS":           re.compile(r'\b117[-\s]?\d{8}\b'),  # SAS Cargo
    "AIR_SWISS":         re.compile(r'\b724[-\s]?\d{8}\b'),  # Swiss WorldCargo
    "AIR_ALITALIA":      re.compile(r'\b055[-\s]?\d{8}\b'),  # ITA Airways (ex-Alitalia)
    "AIR_IBERIA":        re.compile(r'\b075[-\s]?\d{8}\b'),  # Iberia Cargo
    
    # --- Americas ---
    "AIR_CANADA":        re.compile(r'\b014[-\s]?\d{8}\b'),  # Air Canada
    "AIR_UNITED":        re.compile(r'\b016[-\s]?\d{8}\b'),  # United Airlines
    "AIR_DELTA":         re.compile(r'\b006[-\s]?\d{8}\b'),  # Delta Air Lines
    "AIR_AMERICAN":      re.compile(r'\b001[-\s]?\d{8}\b'),  # American Airlines
    "AIR_LATAM":         re.compile(r'\b957[-\s]?\d{8}\b'),  # LATAM Cargo
    "AIR_AEROMEXICO":    re.compile(r'\b139[-\s]?\d{8}\b'),  # Aeromexico Cargo
    
    # --- Cargo Specialists ---
    "AIR_UPS":           re.compile(r'\b406[-\s]?\d{8}\b'),  # UPS Airlines
    "AIR_FEDEX":         re.compile(r'\b023[-\s]?\d{8}\b'),  # FedEx Express
    "AIR_ATLAS":         re.compile(r'\b369[-\s]?\d{8}\b'),  # Atlas Air
    "AIR_POLAR":         re.compile(r'\b403[-\s]?\d{8}\b'),  # Polar Air Cargo
    "AIR_ABX":           re.compile(r'\b832[-\s]?\d{8}\b'),  # ABX Air
    "AIR_KALITTA":       re.compile(r'\b250[-\s]?\d{8}\b'),  # Kalitta Air
    "AIR_WESTERN_GLOBAL": re.compile(r'\b904[-\s]?\d{8}\b'),  # Western Global Airlines
    "AIR_SILK_WAY":      re.compile(r'\b151[-\s]?\d{8}\b'),  # Silk Way Airlines
    
    # --- Generic MAWB ---
    "MAWB_GENERAL":      re.compile(r'\b\d{3}[-\s]?\d{8}\b'),  # Catch-all for any airline

    # =========================================================================
    # 2. OCEAN CARRIERS (MBL & Container IDs)
    # =========================================================================
    # Format: 4-letter carrier code (BIC) + 6-7 digit container number + check digit
    
    # --- Top 10 Global Lines ---
    "CARRIER_MAERSK":    re.compile(r'\bMAEU\d{9}\b'),       # Maersk Line
    "CARRIER_MSC":       re.compile(r'\bMEDU[A-Z0-9]{2,5}\d{6,9}\b'),  # Mediterranean Shipping
    "CARRIER_CMACGM":    re.compile(r'\b(NAM|OCE|LPL|GNC|AME)[A-Z0-9]{6,10}\b'),  # CMA CGM Group
    "CARRIER_COSCO":     re.compile(r'\bCOSU\d{8,12}\b'),    # COSCO Shipping
    "CARRIER_HAPAG":     re.compile(r'\bHLCU[A-Z0-9]{10,15}\b'),  # Hapag-Lloyd
    "CARRIER_ONE":       re.compile(r'\bONEY[A-Z0-9]{8,15}\b'),  # Ocean Network Express
    "CARRIER_EVERGREEN": re.compile(r'\bEGLV\d{10,12}\b'),   # Evergreen Marine
    "CARRIER_HMM":       re.compile(r'\bHDMU[A-Z0-9]{10,15}\b'),  # HMM (formerly Hyundai)
    "CARRIER_HYUNDAI":   re.compile(r'\bHJSU\d{6,7}\b'),     # Hyundai MM (legacy/pre-rebrand)
    "CARRIER_YANGMING":  re.compile(r'\bYMLU\d{9,12}\b'),    # Yang Ming Marine
    "CARRIER_ZIM":       re.compile(r'\bZIMU[A-Z]{3}\d{7,10}\b'),  # ZIM Integrated
    
    # --- Regional & Intra-Asia ---
    "CARRIER_OOCL":      re.compile(r'\bOOLU\d{9,12}\b'),    # Orient Overseas
    "CARRIER_ANL":       re.compile(r'\b(ABG|CAA|OCE|ALK|AHG)\d{7,9}\b'),  # ANL Container Line
    "CARRIER_PIL":       re.compile(r'\b(PKG|NGIC|MAA)\d{8,10}[A-Z]?\b'),  # Pacific International
    "CARRIER_PIL_PACIFIC": re.compile(r'\bPILU\d{6,7}\b'),  # PIL primary BIC code
    "CARRIER_TSLINES":   re.compile(r'\bSLS[A-Z]{3}\d{6,10}\b'),  # TS Lines
    "CARRIER_APL":       re.compile(r'\bAPLU\d{9,12}\b'),    # APL (CMA CGM subsidiary)
    "CARRIER_KLINE":     re.compile(r'\bKKLU\d{9,12}\b'),    # K Line
    "CARRIER_MOL":       re.compile(r'\bMOLU\d{6,7}\b'),     # Mitsui O.S.K. Lines
    "CARRIER_NYK":       re.compile(r'\bNYKU\d{6,7}\b'),     # NYK Line
    "CARRIER_WANHAI":    re.compile(r'\bWHLU\d{9,12}\b'),    # Wan Hai Lines
    "CARRIER_SINOTRANS": re.compile(r'\bSINO[A-Z0-9]{8,12}\b'),  # Sinotrans Container
    "CARRIER_SITC":      re.compile(r'\bSITC[A-Z0-9]{10,15}\b'),  # SITC Container
    "CARRIER_SMLINE":    re.compile(r'\bSMLM[A-Z0-9]{8,12}\b'),  # SM Line
    "CARRIER_RCL":       re.compile(r'\bRCLU\d{6,7}\b'),     # Regional Container Lines
    "CARRIER_HEUNG_A":   re.compile(r'\bHLXU\d{6,7}\b'),     # Heung-A Shipping
    
    # --- Americas Focus ---
    "CARRIER_MATSON":    re.compile(r'\bMATU\d{7,9}\b'),     # Matson Navigation
    "CARRIER_CROWLEY":   re.compile(r'\bCRLU\d{6,7}\b'),     # Crowley Maritime
    "CARRIER_PASHA":     re.compile(r'\bPSHU\d{6,7}\b'),     # Pasha Hawaii
    
    # --- Specialized & Niche ---
    "CARRIER_HAMBURG_SUD": re.compile(r'\bSUDU[A-Z0-9]{12}\b'),  # Hamburg Süd (Maersk Group)
    "CARRIER_STOLT":     re.compile(r'\bSNTU[A-Z0-9]{8,12}\b'),  # Stolt Tankers
    
    # --- RoRo & Project Cargo Specialists ---
    "CARRIER_WALLENIUS": re.compile(r'\bWLWH[A-Z0-9]{8,15}\b'),  # Wallenius Wilhelmsen
    "CARRIER_GRIMALDI_BL": re.compile(r'\b(GDS|ACL|GRIU)[A-Z0-9]{8,15}\b'),  # Grimaldi/ACL
    "CARRIER_GRIMALDI_CNTR": re.compile(r'\bGCNU\d{6,7}\b'),  # Grimaldi Containers
    "CARRIER_SWIRE":     re.compile(r'\b(SSBF|CHVW|PLLU)[A-Z0-9]{7,12}\b'),  # Swire Shipping
    "CARRIER_HOEGH":     re.compile(r'\bHOEG[A-Z0-9]{8,15}\b'),  # Hoegh Autoliners
    "CARRIER_GLOVIS":    re.compile(r'\bGLVU\d{6,7}\b'),     # Hyundai Glovis

    # =========================================================================
    # 3. CONTAINER LEASING COMPANIES (Owner Codes)
    # =========================================================================
    # Note: These appear on containers alongside carrier codes
    
    "CNTR_TRITON":       re.compile(r'\b(TTNU|TCNU|TRHU)\d{6,7}\b'),  # Triton International
    "CNTR_TEXTAINER":    re.compile(r'\b(TEXU|TGHU|AMFU)\d{6,7}\b'),  # Textainer Group
    "CNTR_SEACO":        re.compile(r'\b(SEKU|SCZU|SEGU|SCFU)\d{6,7}\b'),  # Seaco (HNA)
    "CNTR_FLORENS":      re.compile(r'\b(FSCU|FCLU|FFAU)\d{6,7}\b'),  # Florens (COSCO)
    "CNTR_CAI":          re.compile(r'\bCAIU\d{6,7}\b'),     # Container Applications International
    "CNTR_BEACON":       re.compile(r'\bBEAU\d{6,7}\b'),     # Beacon Intermodal Leasing

    # =========================================================================
    # 4. GLOBAL FREIGHT FORWARDERS (HBL - House Bills)
    # =========================================================================
    
    # --- Top 5 Global Integrators ---
    "FWD_DHL_HBL":       re.compile(r'\b[A-Z]{3}A\d{5}\b'),  # DHL Global Forwarding
    "FWD_DHL_REF":       re.compile(r'\bPOAA\d{5,8}\b'),     # DHL Reference Numbers
    "FWD_KUEHNE":        re.compile(r'\bSAG[A-Z0-9]{8,12}\b'),  # Kuehne + Nagel (Sea)
    "FWD_KN_REF":        re.compile(r'\b106\d{7}\b'),        # K+N Reference
    "FWD_DSV_HBL":       re.compile(r'\b[A-Z]{3}\d{7,8}\b'), # DSV Air & Sea
    "FWD_EXPEDITORS":    re.compile(r'\bEXDO[A-Z0-9]{8,15}\b'),  # Expeditors
    "FWD_SCHENKER_KEY":  re.compile(r'(?i)SCHENKER\s(AUSTRALIA|PTY|LTD)'),  # DB Schenker
    
    # --- Major Forwarders (US/Europe) ---
    "FWD_HELLMANN":      re.compile(r'\bHLLM[A-Z0-9]{8,15}\b'),  # Hellmann Worldwide
    "FWD_PANALPINA":     re.compile(r'\bPNEP[A-Z0-9]{8,15}\b'),  # Panalpina (DSV)
    "FWD_BOLLORE":       re.compile(r'\bBOL[A-Z0-9]{8,12}\b'),   # Bolloré Logistics
    "FWD_GEODIS":        re.compile(r'\bGEOD[A-Z0-9]{8,12}\b'),  # GEODIS
    "FWD_CEVA_STD":      re.compile(r'\bCEV\d{9,12}\b'),         # CEVA Logistics
    "FWD_AGILITY":       re.compile(r'\bAGIL[A-Z0-9]{8,12}\b'),  # Agility Logistics
    "FWD_DACHSER":       re.compile(r'\b\d{20}\b'),              # Dachser SSCC
    "FWD_DAMCO":         re.compile(r'\bDAM[A-Z0-9]{8,12}\b'),   # Damco (Maersk)
    "FWD_SANKYU":        re.compile(r'\bSKY[A-Z0-9]{8,12}\b'),   # Sankyu Inc
    "FWD_KINTETSU":      re.compile(r'\bKWE[A-Z0-9]{8,12}\b'),   # Kintetsu World Express
    
    # --- APAC Regional Forwarders ---
    "FWD_NIPPON_EXP":    re.compile(r'\bNEX[A-Z0-9]{8,12}\b'),   # Nippon Express
    "FWD_YUSEN_HBL":     re.compile(r'\bASFN[A-Z0-9]{8,15}\b'),  # Yusen Logistics
    "FWD_YUSEN_REF":     re.compile(r'\bYL[A-Z]{2}\d{6,10}\b'),  # Yusen Legacy
    "FWD_KERRY":         re.compile(r'\bKECL\d{9}\b'),           # Kerry Logistics
    "FWD_PANTOS":        re.compile(r'\b(LX|PANT)[A-Z0-9]{8,12}\b'),  # LX Pantos
    "FWD_SINOTRANS_FWD": re.compile(r'\bSNTO[A-Z0-9]{8,12}\b'),  # Sinotrans Forwarding
    "FWD_DIMERCO":       re.compile(r'\bDMO[A-Z0-9]{8,12}\b'),   # Dimerco Express
    "FWD_OEL":           re.compile(r'\bOEL[A-Z0-9]{8,12}\b'),   # OEL Worldwide
    
    # --- ANZ & Oceania Specialists ---
    "FWD_TOLL_PRIORITY": re.compile(r'\b88\d{10}\b'),            # Toll Priority (13-digit)
    "FWD_TOLL_IPEC":     re.compile(r'\b23\d{10}\b'),            # Toll IPEC Legacy
    "FWD_TOLL_ALPHA":    re.compile(r'\b(BAMY|SHQ)\w{6,10}\b'),  # Toll Alpha Prefix
    "FWD_MAINFREIGHT":   re.compile(r'\b(MFT|APE|MFW|OWE|CHEM)[A-Z]?\d{7,10}\b'),  # Mainfreight
    "FWD_LINFOX":        re.compile(r'\bLFX[A-Z0-9]{7,10}\b'),   # Linfox Logistics
    "FWD_CENTURION":     re.compile(r'\bCEN\d{8,10}\b'),         # Centurion Cargo
    "FWD_FAMOUS":        re.compile(r'\bF[A-Z]{2}[A-Z]{3}\d{6,10}\b'),  # Famous Pacific
    "FWD_MAGELLAN":      re.compile(r'\bMS[A-Z]{2}\d{8,10}[A-Z]?\b'),   # Magellan Logistics
    "FWD_LIGENTIA":      re.compile(r'\bLIG[A-Z]{3}\d{6,9}\b'),  # Ligentia
    "FWD_SHIPCO":        re.compile(r'\b(SDFW\d{7}|8\d{7,8})\b'),  # Shipco Transport
    "FWD_GLOBELINK":     re.compile(r'\b(GL|LQD)[A-Z]{3}\d{6,10}[A-Z]?\b'),  # Globelink
    "FWD_SEABRIDGE":     re.compile(r'\b(SE|SB)[A-Z]{3}\d{5,10}\b'),  # Seabridge Freight
    "FWD_CHARTERLINK":   re.compile(r'\bCCF[A-Z0-9]{8,15}\b'),   # Charterlink
    "FWD_WHALE":         re.compile(r'\bWHL\d{10,12}\b'),        # Whale Logistics
    "FWD_TOMAX":         re.compile(r'\bVIS\s?\d{7}\b'),         # Tomax Logistics
    "FWD_SILK_LOGISTICS": re.compile(r'\b(SCL|SLH)\d{8,12}\b'),  # Silk Contract Logistics
    "FWD_CTI":           re.compile(r'\bCTI[A-Z0-9]{8,12}\b'),   # CTI Logistics
    "FWD_SCT":           re.compile(r'\bSCT\d{8,12}\b'),         # SCT Logistics
    
    # --- Parcel Integrators (Trade Services) ---
    "FWD_UPS_SCS":       re.compile(r'\bUPS[A-Z0-9]{8,12}\b'),   # UPS Supply Chain
    "FWD_FEDEX_TRADE":   re.compile(r'\bFTN[A-Z0-9]{8,12}\b'),   # FedEx Trade Networks

    # =========================================================================
    # 5. NVOCCs (Non-Vessel Operating Common Carriers)
    # =========================================================================
    
    "NVOCC_CAROTRANS_REF": re.compile(r'\b[A-Z]{3}[A-Z]{3}\d{6,10}\b'),  # Carotrans
    "NVOCC_CAROTRANS_EMAIL": re.compile(r'[\w\.-]+@carotrans\.com\.au'),
    "NVOCC_VANGUARD":    re.compile(r'\b[A-Z]{6}V?\d{5,8}V?\b'),  # Vanguard Logistics
    "NVOCC_AMASS":       re.compile(r'\bAMIGL\d+(?:[A-Z])?\b'),   # Amass Freight
    "NVOCC_FLEXPORT":    re.compile(r'\bFLEX[A-Z0-9]{8,12}\b'),   # Flexport
    "NVOCC_FREIGHTOS":   re.compile(r'\bFGTS[A-Z0-9]{8,12}\b'),   # Freightos

    # =========================================================================
    # 6. EXPRESS COURIERS & PARCEL CARRIERS
    # =========================================================================
    
    # --- Australia/NZ ---
    "COURIER_AUSPOST":   re.compile(r'\b(3|7)\d{16}\b'),         # Australia Post (17-digit)
    "COURIER_STARTRACK": re.compile(r'\b7\d{15}\b'),             # StarTrack (AusPost)
    "COURIER_FASTWAY":   re.compile(r'\b[A-Z]{3}\d{10}\b'),      # Aramex/Fastway
    "COURIER_COURIERS_PLEASE": re.compile(r'\b[A-Z]{2}\d{10}\b'),  # Couriers Please
    
    # --- Global Integrators ---
    "COURIER_DHL_EXPRESS": re.compile(r'\b\d{10,11}\b'),         # DHL Express tracking
    "COURIER_TNT":       re.compile(r'\b(GD|EX)\d{9,12}\b'),     # TNT Express (FedEx)
    "COURIER_FEDEX":     re.compile(r'\b\d{12,14}\b'),           # FedEx tracking
    "COURIER_UPS":       re.compile(r'\b1Z[A-Z0-9]{16}\b'),      # UPS tracking

    # =========================================================================
    # 7. FREIGHT MANAGEMENT SYSTEMS (CargoWise, etc.)
    # =========================================================================
    
    "SYS_CARGOWISE_SHIP":   re.compile(r'\bS\d{8,10}\b'),     # Shipment Numbers
    "SYS_CARGOWISE_CONSOL": re.compile(r'\bC\d{8,10}\b'),     # Consolidation Numbers
    "SYS_CARGOWISE_ORDER":  re.compile(r'\bO\d{8,10}\b'),     # Order Numbers
    "SYS_CARGOWISE_JOB":    re.compile(r'\bJ\d{8,10}\b'),     # Job Numbers

    # =========================================================================
    # 8. CONTAINER DEPOTS & TERMINALS (ANZ Focus)
    # =========================================================================
    
    # --- Major Multi-Site Operators ---
    "DEPOT_QUBE":        re.compile(r'(?i)QUBE\sLOGISTICS'),
    "DEPOT_DPWORLD":     re.compile(r'(?i)DP\sWORLD'),
    "DEPOT_ACFS":        re.compile(r'(?i)ACFS\s(PORT|MELBOURNE|BRISBANE)'),
    "DEPOT_PATRICK":     re.compile(r'(?i)PATRICK\s(TERMINALS|AUTOCARE)'),
    "DEPOT_HUTCHISON":   re.compile(r'(?i)HUTCHISON\sPORTS'),
    
    # --- Melbourne ---
    "DEPOT_MEDLOG":      re.compile(r'(?i)MEDLOG\sTRANSPORT'),
    "DEPOT_PORTGATE":    re.compile(r'(?i)PORTGATE\sLOGISTICS'),
    "DEPOT_CITO":        re.compile(r'(?i)CITO\sTRANSPORT'),
    "DEPOT_SECON":       re.compile(r'(?i)SECON\sFREIGHT'),
    "DEPOT_BUCCINI":     re.compile(r'(?i)BUCCINI\sTRANSPORT'),
    "DEPOT_GALAXY":      re.compile(r'(?i)GALAXY\s*HUB'),
    "DEPOT_TASMAN":      re.compile(r'(?i)TASMAN\sLOGISTICS'),
    "DEPOT_INTERPORT":   re.compile(r'(?i)INTERPORT\sCARGO'),
    "DEPOT_TCW":         re.compile(r'(?i)THE\sCARGO\sWAREHOUSE'),
    "DEPOT_ARROW":       re.compile(r'(?i)ARROW\sTRANSPORT'),
    "DEPOT_VFS":         re.compile(r'(?i)VICTORIAN\sFREIGHT\sSPECIALISTS'),
    "DEPOT_CFSOL":       re.compile(r'(?i)CUSTOMISED\sFREIGHT\sSOLUTIONS'),
    "DEPOT_BFS":         re.compile(r'(?i)BUTLER\sFREIGHT'),
    "DEPOT_MFS":         re.compile(r'(?i)MELBOURNE\sFREIGHT\sSTATION'),
    "DEPOT_CFSMEL":      re.compile(r'(?i)CARGO\sFREIGHT\sSERVICES'),
    
    # --- Sydney ---
    "DEPOT_1STOP":       re.compile(r'(?i)1STOP\sCONNECTIONS'),
    "DEPOT_SCT_SYD":     re.compile(r'(?i)SCT\sLOGISTICS'),
    
    # --- Brisbane ---
    "DEPOT_OCTFOLIO":    re.compile(r'(?i)OCTFOLIO'),
}

# =============================================================================
# PATTERN STATISTICS
# =============================================================================
"""
Total Patterns: 170+
- Airfreight: 44 airlines
- Ocean Carriers: 44 shipping lines (including specialized)
- Container Lessors: 6 major leasing companies
- Forwarders: 52 global and regional forwarders
- NVOCCs: 6 specialized operators
- Couriers: 9 express carriers
- Systems: 4 CargoWise reference types
- Depots: 25 ANZ facilities
"""

#

def identify_matches(input_val): 
    """Returns a list of all matching labels for a given input."""
    if pd.isna(input_val):
        return []
    
    input_str = str(input_val)
    found_matches = []
    
    for label, pattern in PATTERNS.items():
        if pattern.search(input_str):
            found_matches.append(label)
            
    return found_matches

def get_strategy(matches):
    """Returns a human-readable strategy based on the best match."""
    if not matches:
        return "Unknown Format"
    
    primary = matches[0]
    
    if "SYS_CARGOWISE" in primary:
        return "CargoWise System - Standard Layout"
    if "AIR_" in primary:
        return "Airfreight - Check Airline Tracker"
    if "CARRIER_" in primary:
        return "Shipping Line MBL - Track on Carrier Site"
    if "NVOCC_CAROTRANS" in primary:
        return "Wholesaler - Search Doc for Underlying HBL"
    if "DEPOT_" in primary:
        return "Depot Location - Check Availability"
    
    return "Forwarder / NVOCC House Bill"

def process_file():
    print(f"Reading {INPUT_FILE}...")
    
    # 1. Detect file type and load
    try:
        if INPUT_FILE.endswith('.csv'):
            df = pd.read_csv(INPUT_FILE)
        elif INPUT_FILE.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(INPUT_FILE)
        else:
            print("Error: Input file must be .csv or .xlsx")
            return
    except FileNotFoundError:
        print(f"Error: Could not find {INPUT_FILE} in current folder.")
        return

    # 2. Check if column exists
    if COLUMN_TO_SEARCH not in df.columns:
        print(f"Error: Column '{COLUMN_TO_SEARCH}' not found.")
        print(f"Available columns: {list(df.columns)}")
        print("Please edit the COLUMN_TO_SEARCH variable in the script.")
        return

    print(f"Processing {len(df)} rows...")

    # 3. Apply the Identification Engine
    # We create two new columns: 'Identified_Entity' and 'Strategy_Hint'
    df['Matches'] = df[COLUMN_TO_SEARCH].apply(identify_matches)
    
    # Clean up the list to a string for the CSV (e.g., "CARRIER_MSC | NVOCC_CAROTRANS")
    df['Identified_Entity'] = df['Matches'].apply(lambda x: " | ".join(x) if x else "UNKNOWN")
    df['Strategy_Hint'] = df['Matches'].apply(get_strategy)

    # Remove the temporary list column
    df = df.drop(columns=['Matches'])

    # 4. Save
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Success! Results saved to: {OUTPUT_FILE}")
    print(df[[COLUMN_TO_SEARCH, 'Identified_Entity', 'Strategy_Hint']].head())

if __name__ == "__main__":
    process_file()
