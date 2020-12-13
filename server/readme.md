# [setup and deploy](setup.md)

# Enable JS Debugging

* modify `explorer/processors.py`, change to
```
def environment(request):
    return {
        "ENV_is_production": False
    }
```

* update build script, change `build-js.sh`, change to
```
#!/bin/sh

# npm run build-prod
npm run build-dev
```

**Do not to change it back once debug is done!!**

