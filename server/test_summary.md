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
        Tenant                              [ X ]

        User                                [ X ]
        UserTenantSubscription              [ X ]
        Application                         [ X ]
        DataRepo                            [ X ]
        Dataset                             [ X ]          100%
        Asset                               [ X ]
        AssetDep                            [ X ]
        DataLocation                        [ X ]
        Pipeline                            [ X ] TODO, need to add unique keys
        PipelineGroup                       [ X ]

        PipelineInstance                    [ ? ]
        Timer                               [ ? ]
        ScheduledEvent                      [ ? ]
        AccessToken                         [ ? ]
```
