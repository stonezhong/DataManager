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
        PipelineGroup                       [ X ]
        Pipeline                            [ X ]          N/A, no test file

        PipelineInstance                    [ X ]
        Timer                               [ X ]

        ScheduledEvent                      [ ? ]
        AccessToken                         [ ? ]
```
