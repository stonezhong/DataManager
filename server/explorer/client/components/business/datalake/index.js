import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Container from 'react-bootstrap/Container';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {DataTable} from '/components/generic/datatable/main.jsx';

import {is_json_string, get_unsigned_integer} from '/common_lib.js';
import {StandardDialogbox, TextEditor} from '/components/generic/dialogbox/standard.jsx';
import {saveTenant} from '/apis';

import "./datalake.scss";

const _ = require("lodash");

const DATALAKE_TYPE_ON_PREMISE  = 'on-premise';
const DATALAKE_TYPE_AWS_EMR     = 'aws-emr';

const modelApis = {
    'on-premise': {
        field: 'on_premise',
        defaultValue: () => {
            return {
                livy_host: '',
                livy_port: 8998,
                livy_protocol: 'http',
                livy_username: '',
                livy_password: '',
                livy_via_tunnel: true,
                bridge: '',
                stage_dir: '',
                run_dir: '',
                ssh_config: {
                    config: '',
                    keys: {}
                },
                dm_username: '',
                dm_password: '',
            };
        },
        toUI: (model) => {
            const uiModel = _.cloneDeep(model);
            uiModel.livy_port = model.livy_port.toString();
            uiModel._error_fields = new Set();
            return uiModel;

        },
        fromUI: (uiModel) => {
            const model = _.cloneDeep(uiModel);
            delete model._error_fields;
            const livy_port = get_unsigned_integer(uiModel.livy_port);
            model.livy_port = (livy_port===null?8998:livy_port);
            return model;
        },
        validators: {
            fieldNotEmptyAfterTrim: field_value => field_value.trim().length > 0,
            isValidNumber:          field_value => get_unsigned_integer(field_value) !== null,
        }
    },
    'aws-emr': {
        field: 'aws_emr',
        defaultValue: () => {
            return {
                master_node: '',
                run_dir: '',
                dm_username:'',
                dm_password:'',
                ssh_config: {},
            };
        },
        toUI: (model) => {
            const uiModel = _.cloneDeep(model);
            uiModel._error_fields = new Set();
            return uiModel;

        },
        fromUI: (uiModel) => {
            const model = _.cloneDeep(uiModel);
            delete model._error_fields;
            return model;
        },
        validators: {
            fieldNotEmptyAfterTrim: field_value => field_value.trim().length > 0,
        }
    }
}

/*********************************************************************************
 * Purpose: Edit an Datalake
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, datalake) is called.
 *                mode is either "new" or "edit"
 *
 */
export class DatalakeEditor extends StandardDialogbox {
    theAWSEMRSSHConfigEditorRef = React.createRef();
    theOnPremiseSSHConfigEditorRef = React.createRef();

    initDatalakeValue = () => {
        return {
            name: '-- enter name --',
            description: '',
            is_public: false,
        }
    };

    dialogClassName = "datalake-editor-modal";

    validate_field = (dl_config, type, name, field) => {
        if (dl_config.type !== type) {
            this.get_config_for_type(dl_config)._error_fields.delete(field);
            return true;
        }
        const config = this.get_config_for_type(dl_config); // get type specific config
        const fieldValue = config[field];
        const _error_fields = config._error_fields;
        const ret = modelApis[type].validators[name](fieldValue);
        if (ret) {
            _error_fields.delete(field);
        } else {
            _error_fields.add(field);
        }
        return ret;
    };

    get_config_for_type = (dl_config) => {
        const type = dl_config.type;
        const fld = modelApis[type].field;
        return dl_config[fld];
    };

    isNameValid = (datalake) => {
        return datalake.name.trim().length > 0;
    }

    onSave = () => {
        const {datalake, mode, dl_config} = this.state.payload;
        const config = {type: dl_config.type};
        const cfgField = modelApis[dl_config.type].field;
        config[cfgField] = modelApis[dl_config.type].fromUI(dl_config[cfgField]);

        const ui_datalake = _.cloneDeep(datalake);
        ui_datalake.config = JSON.stringify(config);
        return this.props.onSave(mode, ui_datalake);
    };

    canSave = () => {
        const {datalake, dl_config} = this.state.payload;

        if (!this.isNameValid(datalake)) {
            return false;
        }

        if (this.get_config_for_type(dl_config)._error_fields.size > 0) {
            return false;
        }
        return true;
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    generate_default_dl_config = (dl_config) => {
        // check if cfg for the data lake type exists
        const cfgField = modelApis[dl_config.type].field;
        if (!(cfgField in dl_config)) {
            dl_config[cfgField] = modelApis[dl_config.type].defaultValue();
        }
        // conver to UI model
        dl_config[cfgField] = modelApis[dl_config.type].toUI(dl_config[cfgField]);
    };

    onOpen = openArgs => {
        const {mode, datalake} = openArgs;

        if (mode === "view" || mode === "edit") {
            let dl_config = {};
            try {
                dl_config = JSON.parse(datalake.config);
            }
            catch(error) {
            }
            if (!('type' in dl_config)) {
                dl_config.type = DATALAKE_TYPE_ON_PREMISE;
            }
            this.generate_default_dl_config(dl_config);
            return {
                mode: mode,
                datalake: _.cloneDeep(datalake),
                dl_config: dl_config,
            };
        } else if (mode === "new") {
            const dl_config = {type: DATALAKE_TYPE_ON_PREMISE};
            this.generate_default_dl_config(dl_config);
            return {
                mode: mode,
                datalake: _.cloneDeep(this.initDatalakeValue()),
                dl_config: dl_config
            }
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new Datalake";
        } else if (mode === "edit") {
            return "edit Datalake";
        } else if (mode === "view") {
            return "Datalake"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    render_on_premise = () => {
        const {datalake, mode, dl_config} = this.state.payload;
        const on_premise = dl_config.on_premise;
        return (
            <Container fluid className="pt-2">
                <Form.Group as={Row} controlId="livy-name">
                    <Form.Label column sm={2}>Livy host</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.livy_host}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'fieldNotEmptyAfterTrim', 'livy_host'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.livy_host = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="livy-port">
                    <Form.Label column sm={2}>Livy port</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.livy_port}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'isValidNumber', 'livy_port'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.livy_port = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Not a valid port number.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="livy-protocol">
                    <Form.Label column sm={2}>Livy protocol</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            as="select"
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.livy_protocol}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.livy_protocol = v;
                                        return state;
                                    }
                                )
                            }}
                        >
                            <option key="http" value="http">http</option>
                            <option key="https" value="https">https</option>
                        </Form.Control>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="livy-username">
                    <Form.Label column sm={2}>Livy username</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.livy_username}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.livy_username = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="livy-password">
                    <Form.Label column sm={2}>Livy password</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            type="password"
                            disabled = {mode==='view'}
                            value={on_premise.livy_password}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.livy_password = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="livy-via-tunnel">
                    <Form.Label column sm={2}>Livy via tunnel</Form.Label>
                    <Col sm={10}>
                        <Form.Check
                            type="checkbox"
                            checked={on_premise.livy_via_tunnel}
                            disabled = {mode==='view'}
                            onChange={(event) => {
                                const checked = event.target.checked;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.livy_via_tunnel = checked;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="bridge">
                    <Form.Label column sm={2}>Bridge host</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.bridge}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'fieldNotEmptyAfterTrim', 'bridge'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.bridge = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="stage-dir">
                    <Form.Label column sm={2}>Stage Directory</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.stage_dir}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'fieldNotEmptyAfterTrim', 'stage_dir'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.stage_dir = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="run-dir">
                    <Form.Label column sm={2}>Run Directory</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.run_dir}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'fieldNotEmptyAfterTrim', 'run_dir'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.run_dir = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>
                <Button
                    onClick={ event => {
                        this.theOnPremiseSSHConfigEditorRef.current.openDialog({
                            mode: "edit" ,
                            ssh_config: on_premise.ssh_config
                        })
                    }}
                >
                    Set SSH Config
                </Button>

                <Form.Group as={Row} controlId="on-premise-dm-username">
                    <Form.Label column sm={2}>DM Username</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            type="text"
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.dm_username}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'fieldNotEmptyAfterTrim', 'dm_username'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.dm_username = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="on-premise-dm-password">
                    <Form.Label column sm={2}>DM Password</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            type="password"
                            size="sm"
                            disabled = {mode==='view'}
                            value={on_premise.dm_password}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_ON_PREMISE, 'fieldNotEmptyAfterTrim', 'dm_password'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.on_premise.dm_password = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <SSHConfigEditor
                    ref={this.theOnPremiseSSHConfigEditorRef}
                    onSave={(mode, ssh_config) => {
                        this.setState(
                            state => {
                                state.payload.dl_config.on_premise.ssh_config = _.cloneDeep(ssh_config);
                                return state;
                            }
                        )
                    }}
                />
            </Container>
        );
    };

    render_aws_emr = () => {
        const {datalake, mode, dl_config} = this.state.payload;
        const aws_emr = dl_config.aws_emr;
        return (
            <Container fluid className="pt-2">
                <Form.Group as={Row} controlId="name">
                    <Form.Label column sm={2}>Master Node</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={aws_emr.master_node}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_AWS_EMR, 'fieldNotEmptyAfterTrim', 'master_node'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.aws_emr.master_node = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="run-dir">
                    <Form.Label column sm={2}>Run dir</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={aws_emr.run_dir}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_AWS_EMR, 'fieldNotEmptyAfterTrim', 'run_dir'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.aws_emr.run_dir = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="dm-username">
                    <Form.Label column sm={2}>DM Username</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={aws_emr.dm_username}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_AWS_EMR, 'fieldNotEmptyAfterTrim', 'dm_username'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.aws_emr.dm_username = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="dm-password">
                    <Form.Label column sm={2}>DM Password</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            type="password"
                            size="sm"
                            disabled = {mode==='view'}
                            value={aws_emr.dm_password}
                            isInvalid={!this.validate_field(
                                dl_config, DATALAKE_TYPE_AWS_EMR, 'fieldNotEmptyAfterTrim', 'dm_password'
                            )}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dl_config.aws_emr.dm_password = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                        <Form.Control.Feedback tooltip type="invalid">
                            Cannot be empty.
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Button
                    onClick={ event => {
                        this.theAWSEMRSSHConfigEditorRef.current.openDialog({
                            mode: "edit" ,
                            ssh_config: aws_emr.ssh_config
                        })
                    }}
                >Set SSH Config</Button>

                <SSHConfigEditor
                    ref={this.theAWSEMRSSHConfigEditorRef}
                    onSave={(mode, ssh_config) => {
                        this.setState(
                            state => {
                                state.payload.dl_config.aws_emr.ssh_config = _.cloneDeep(ssh_config);
                                return state;
                            }
                        )
                    }}
                />
            </Container>
        );
    };

    renderBody = () => {
        const {datalake, mode, dl_config} = this.state.payload;
        return (
            <div>
                <Form autoComplete="off">
                    <Tabs
                        defaultActiveKey="BasicInfo"
                        transition={false}
                    >
                        <Tab eventKey="BasicInfo" title="Basic Info">
                            <Container fluid className="pt-2">
                                <Form.Group as={Row} controlId="name">
                                    <Form.Label column sm={2}>Name</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            size="sm"
                                            disabled = {mode==='edit'||mode==='view'}
                                            value={datalake.name}
                                            isInvalid={!this.isNameValid(datalake)}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(
                                                    state => {
                                                        state.payload.datalake.name = v;
                                                        return state;
                                                    }
                                                )
                                            }}
                                        />
                                        <Form.Control.Feedback tooltip type="invalid">
                                            Cannot be empty.
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} controlId="description">
                                    <Form.Label column sm={2}>Description</Form.Label>
                                    <Col sm={10}>
                                        <CKEditor
                                            editor={ ClassicEditor }
                                            data={datalake.description}
                                            disabled={mode==='view'}
                                            type="classic"
                                            onChange={(event, editor) => {
                                                const v = editor.getData();
                                                this.setState(
                                                    state => {
                                                        state.payload.datalake.description = v;
                                                        return state;
                                                    }
                                                )
                                            }}
                                        />
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row}>
                                    <Form.Label className="pr-2" >Type</Form.Label>
                                    <Form.Check
                                        disabled = {mode==='view'}
                                        inline
                                        name="datalake-type"
                                        label="On-Premise Spark"
                                        type="radio"
                                        checked={dl_config.type==DATALAKE_TYPE_ON_PREMISE}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.dl_config.type = DATALAKE_TYPE_ON_PREMISE;
                                                this.generate_default_dl_config(state.payload.dl_config);
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        disabled = {mode==='view'}
                                        inline
                                        name="datalake-type"
                                        label="Spark on AWS EMR"
                                        type="radio"
                                        checked={dl_config.type==DATALAKE_TYPE_AWS_EMR}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.dl_config.type = DATALAKE_TYPE_AWS_EMR;
                                                this.generate_default_dl_config(state.payload.dl_config);
                                                return state;
                                            })
                                        }}
                                    />
                                </Form.Group>
                            </Container>
                        </Tab>
                        {
                            dl_config.type === DATALAKE_TYPE_AWS_EMR &&
                            <Tab eventKey={DATALAKE_TYPE_AWS_EMR} title="Spark on AWS EMR">
                                {
                                    this.render_aws_emr()
                                }
                            </Tab>
                        }
                        {
                            dl_config.type === DATALAKE_TYPE_ON_PREMISE &&
                            <Tab eventKey={DATALAKE_TYPE_ON_PREMISE} title="On-Permise Spark">
                                {
                                    this.render_on_premise()
                                }
                            </Tab>
                        }
                    </Tabs>
                </Form>
            </div>
        );
    }
}


/*********************************************************************************
 * Purpose: Show list of subscriptions
 * TODO: pagination
 *
 * Props
 *     subscriptions : a list of subscriptions
 *
 */
 export class SubscriptionTable extends React.Component {
    theDataTableRef     = React.createRef();
    theDatalakeEditorRef    = React.createRef();

    onSave = (mode, tenant) => {
        return saveTenant(
            this.props.csrf_token, mode, tenant
        ).then(this.theDataTableRef.current.refresh)
    };

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {});
    };

    render_tools = subscription => {
        return (<Button
            variant="secondary"
            size="sm"
            onClick={() => {
                this.theDatalakeEditorRef.current.openDialog({
                    mode: "edit",
                    datalake: subscription.tenant
                });
            }}
        >
            Edit
        </Button>);
    };

    render_name = subscription => {
        return <DatalakeLink datalake={subscription.tenant} />;
    };

    render_is_admin = subscription => {
        return <div>{subscription.is_admin?"Yes":"No"}</div>;
    };

    columns = {
        tools:              {display:"", render_data: this.render_tools},
        name:               {display: "Name", render_data: this.render_name},
        is_admin:           {display: "Is Admin", render_data: this.render_is_admin},
    };

    refresh = () => this.theDataTableRef.current.refresh();
    reset   = () => this.theDataTableRef.current.reset();

    render() {
        return (
            <div>
                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="subscription-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />
                <DatalakeEditor
                    ref={this.theDatalakeEditorRef}
                    onSave={this.onSave}
                />
            </div>
        )
    }
}

/*********************************************************************************
 * Purpose: Link to an application
 *
 * Props
 *     application: The application to link to
 *
 */

 export class DatalakeLink extends React.Component {
    render() {
        return (
            <a href={`/explorer/${this.props.datalake.id}/datasets`}>
                {this.props.datalake.name}
            </a>
        );
    }
}

function get_digest(text, maxLen) {
    if (text.length > maxLen) {
        return text.substring(0, maxLen - 3) + "...";
    }
    return text;
}

export class SSHConfigEditor extends StandardDialogbox {
    dialogClassName = "ssh-config-editor-modal";
    theTextEditorRef = React.createRef();

    initPipelineValue = () => {
        return {
            config: '',
            keys: {},
            _to_add_key_name: '',
            _to_add_key_value: '',
        };
    };

    onSave = () => {
        const {ssh_config, mode} = this.state.payload;

        const ssh_config_to_save = _.cloneDeep(ssh_config);
        delete ssh_config_to_save._to_add_key_name;
        delete ssh_config_to_save._to_add_key_value;

        return this.props.onSave(mode, ssh_config_to_save);
    };

    canSave = () => {
        return true;
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, ssh_config} = openArgs;
        const ui_ssh_config = _.cloneDeep(ssh_config);
        if (!('config' in ui_ssh_config)) {
            ui_ssh_config.config = '';
        }
        if (!('keys' in ui_ssh_config)) {
            ui_ssh_config.keys = {};
        }
        ui_ssh_config._to_add_key_name = '';
        ui_ssh_config._to_add_key_value = '';
        if (mode === "view" || mode === "edit") {
            return {
                mode: mode,
                ssh_config: ui_ssh_config,
            };
        } else {
            return {
                mode: mode,
                ssh_config: this.initPipelineValue(),
            };
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new SSH Config";
        } else if (mode === "edit") {
            return "edit SSH Config";
        } else if (mode === "view") {
            return "SSH Config"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    is_valid_key_to_add = () => {
        return (
            this.state.payload.ssh_config._to_add_key_name.length > 0 &&
            this.state.payload.ssh_config._to_add_key_value.length > 0 &&
            !(this.state.payload.ssh_config._to_add_key_name in this.state.payload.ssh_config.keys)
        );
    };

    renderBody = () => {
        const {ssh_config, mode} = this.state.payload;
        return (
            <Form spellCheck="false">
                <Container fluid className="pt-2">
                    <Form.Group as={Row} controlId="name">
                        <Form.Label column sm={2}>Config</Form.Label>
                        <Col sm={10}>
                            <Form.Control as="textarea" rows={10} data-role="ssh-config"
                                disabled = {mode==='view'}
                                value={ssh_config.config}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.payload.ssh_config.config = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                        </Col>
                    </Form.Group>
                </Container>
                <table data-role="keys-table">
                    <tbody>
                        <tr>
                            <th data-role="action1"></th>
                            <th data-role="key-name">Private Key Name</th>
                            <th data-role="key-valye">Content</th>
                            <th data-role="action2"></th>
                        </tr>
                        {
                            Object.keys(this.state.payload.ssh_config.keys).map(
                                key => {
                                    const v = this.state.payload.ssh_config.keys[key];
                                    return (
                                        <tr key={key}>
                                            <td>
                                                <Button size="sm" onClick={event => {
                                                    this.setState(
                                                        state => {
                                                            delete state.payload.ssh_config.keys[key];
                                                            return state;
                                                        }
                                                    );
                                                }}
                                                >Delete</Button>
                                            </td>
                                            <td>{key}</td>
                                            <td>{ get_digest(this.state.payload.ssh_config.keys[key], 20) }</td>
                                            <td>
                                                <Button size="sm"
                                                    onClick={() => {
                                                        this.theTextEditorRef.current.openDialog({
                                                            title: "Update SSH Private Key Value",
                                                            viewOnly: false,
                                                            text: this.state.payload.ssh_config.keys[key],
                                                            onSave: (text) => {
                                                                this.setState(
                                                                    state => {
                                                                        state.payload.ssh_config.keys[key] = text;
                                                                        return state;
                                                                    }
                                                                )
                                                            },
                                                        })
                                                    }}
                                                >
                                                    Update
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                }
                            )
                        }
                        <tr>
                            <td>
                                <Button size="sm"
                                    disabled = {mode==='view' || !this.is_valid_key_to_add()}
                                    onClick={ event => {
                                        this.setState(
                                            state => {
                                                const key_name  = state.payload.ssh_config._to_add_key_name;
                                                const key_value = state.payload.ssh_config._to_add_key_value;
                                                state.payload.ssh_config.keys[key_name] = key_value;
                                                state.payload.ssh_config._to_add_key_name = '';
                                                state.payload.ssh_config._to_add_key_value= '';
                                                return state;
                                            }
                                        )
                                    }}
                                >Add</Button>
                            </td>
                            <td>
                                <Form.Control
                                    size="sm"
                                    disabled = {mode==='view'}
                                    value={ssh_config._to_add_key_name}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                this.state.payload.ssh_config._to_add_key_name = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </td>
                            <td>
                                { get_digest(this.state.payload.ssh_config._to_add_key_value, 20) }
                            </td>
                            <td>
                                <Button size="sm"
                                    onClick={() => {
                                        this.theTextEditorRef.current.openDialog({
                                            title: "Set SSH Private Key Value",
                                            viewOnly: false,
                                            text: this.state.payload.ssh_config._to_add_key_value,
                                            onSave: (text) => {
                                                this.setState(
                                                    state => {
                                                        state.payload.ssh_config._to_add_key_value = text;
                                                        return state;
                                                    }
                                                )
                                            },
                                        })
                                    }}
                                >
                                    Set
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <TextEditor
                    ref={this.theTextEditorRef}
                    dialogClassName="ssh-key-editor"
                />
            </Form>
        );
    };
}
