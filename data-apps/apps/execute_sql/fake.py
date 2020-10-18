fake_input = {
    "steps": [
        {
            "name": "step1",
            "imports": [
                {
                    "dsi_name": "foo",
                    "alias": "trading"
                }
            ],
            "sql": "SELECT * FROM trading",
            "alias": "X",
            "save_output": False
        }

    ]
}