```
To test all:
    python manage.py test

To test a given module:
    python manage.py test main.tests.models

To test a given class:
    python manage.py test main.tests.models.UserTenantSubscriptionTestCase

To test a given method:
    python manage.py test main.tests.models.TenantTestCase.test_create

```

```
                                                           Coverage
------------------------------------------------------------------------------------------------------
Models
    main
        Tenant                              [ X ]          100%
        Dataset                             [ X ]          100%
        User                                [ X ]          N/A, no test file
        Application                         [ X ]          100%
        UserTenantSubscription              [ X ]          100%
        DataRepo                            [ X ]          100%
        Asset                               [ X ]          100%
        AssetDep                            [ X ]          100%
        DataLocation                        [ X ]          100%
        PipelineGroup                       [ X ]          100%
        Pipeline                            [ X ]          N/A, no test file
        PipelineInstance                    [ X ]          100%
        ScheduledEvent                      [ X ]          N/A, no code
        Timer                               [ X ]          100%
        AccessToken                         [ X ]          100%
```

UI测试
```
    [ X ]   Login Page
    [ X ]   Sign Up Page
    [ X ]   Logoff Page
    [ X ]   Data Lake Page
    [ X ]   Datasets Page
    [ X ]   Dataset Page
```

API测试
```
    [ X ]   /api/UserTenantSubscriptions
    [ X ]   /api/Tenants
    [ X ]   /api/<?>/Datasets
    [ X ]   /api/<?>/Assets
```
