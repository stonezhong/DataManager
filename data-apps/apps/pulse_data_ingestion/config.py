OHDDATA_NAMESPACE = "idrnu3akjpv5"

OHDDATA_BUCKETS = {
    # Pulse V1
    "power": {
        "beta": "BetaPulseTier1Daily_df.power",
        "prod": "ProdPulseTier1Daily_df.power",
    },
    "problems": {
        "beta": "BetaPulseTier1Daily_df.problems",
        "prod": "ProdPulseTier1Daily_df.problems",
    },
    "sw_info": {
        "beta": "BetaPulseTier1Daily_df.sw_info",
        "prod": "ProdPulseTier1Daily_df.sw_info",
    },
    "frus": {
        "beta": "BetaPulseTier1Daily_df.frus",
        "prod": "ProdPulseTier1Daily_df.frus",
    },
    # Pulse V2
    "pulse_sp_state": {
        "beta": "BetaPulseTier1Daily_df.pulse_sp_state",
        "prod": "ProdPulseTier1Daily_df.pulse_sp_state",
    },
    "pulse_fru": {
        "beta": "BetaPulseTier1Daily_df.pulse_fru",
        "prod": "ProdPulseTier1Daily_df.pulse_fru",
    },
}

# This is the region where
# 1) The dataflow applications deploys tol
# 2) The region that hold the object storage buckets, we use a single region to 
#    store all the data.
OHDDATA_REGION = "IAD"