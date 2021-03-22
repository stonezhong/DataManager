import React from 'react';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import * as Icon from 'react-bootstrap-icons';

import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a SQL Step inside a Spark-SQL task
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, step) is called.
 *
 */

export class SQLStepEditor extends StandardDialogbox {
    initStepValue = () => {
        return {
            name: '-- enter name --',
            imports: [],        // bunch of imports, e.g. [{dataset_instance: "foo.bar:1.0:1/2020-09-16", alias: "a"}]
            sql: '',
            alias: '',          // output the dataframe as an alias
            _output: false,     // do we want to write the query result?
            output: {
                type: 'parquet',
                write_mode: 'overwrite',
                location: '',
                register_dataset_instance: '',
                data_time: '',
            },
            _toAddAlias: '',
            _toAddAssertPath: ''
        }
    };

    dialogClassName = "sql-step-editor";

    isNameValid = (step) => {
        return step.name.trim().length > 0;
    }

    isSQLValid = (step) => {
        return step.sql.trim().length > 0;
    }

    isOutputLocationValid = (step) => {
        if (!step._output) {
            return true;
        }
        return step.output.location.trim().length > 0;
    };

    isOutputDataTimeValid = (step) => {
        if (!step._output) {
            return true;
        }
        return step.output.data_time.trim().length > 0;
    };

    deleteImport = alias => {
        const {step} = this.state.payload;

        const new_imports = step.imports.filter(x => x.alias != alias);
        this.setState(state => {
            state.payload.step.imports = new_imports;
            return state;
        });
    };

    onSave = () => {
        const {step, mode} = this.state.payload;
        const stepToSave = _.cloneDeep(step);

        stepToSave.name = stepToSave.name.trim();
        stepToSave.sql = stepToSave.sql.trim();
        delete stepToSave._toAddAlias;
        delete stepToSave._toAddAssertPath;
        if (!stepToSave._output) {
            delete stepToSave.output;
        }
        delete stepToSave._output;
        if ('output' in step) {
            step.output.location = step.output.location.trim();
            step.output.data_time = step.output.data_time.trim();
        }

        // TODO: populate error message on failure
        return this.props.onSave(mode, stepToSave);
    };

    canSave = () => {
        const {step} = this.state.payload;

        return this.isNameValid(step) &&
            this.isSQLValid(step) &&
            this.isOutputLocationValid(step) &&
            this.isOutputDataTimeValid(step);
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, step} = openArgs;
        if (mode === "view" || mode === "edit") {
            const myStep = _.cloneDeep(step);
            myStep._toAddAlias = '';
            myStep._toAddAssertPath = '';
            if ('output' in step) {
                myStep._output = true;
            } else {
                myStep._output = false;
                myStep.output = {
                    type: 'parquet',
                    write_mode: 'overwrite',
                    location: '',
                    register_dataset_instance: '',
                    data_time: ''
                };
            }
            return {
                mode: mode,
                step: myStep
            };
        } else if (mode === "new") {
            return {
                mode: mode,
                step:  this.initStepValue(),
            };
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new SQL Step";
        } else if (mode === "edit") {
            return "edit SQL Step";
        } else if (mode === "view") {
            return "SQL Step"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    renderBody = () => {
        const {mode, step} = this.state.payload;
        return (
            <div>
                <Tabs
                    defaultActiveKey="BasicInfo"
                    transition={false}
                >
                    <Tab eventKey="BasicInfo" title="Basic Info">
                        <Container fluid className="pt-2">
                            <Form.Row>
                                <Form.Group as={Col} controlId="sql-step-name">
                                    <Form.Label column sm={2}>Name</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            size="sm"
                                            disabled = {mode==='edit'||mode==='view'}
                                            value={step.name}
                                            isInvalid={!this.isNameValid(step)}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.payload.step.name = v;
                                                    return state;
                                                })
                                            }}
                                        />
                                        <Form.Control.Feedback tooltip type="invalid">
                                            Cannot be empty.
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                            </Form.Row>
                            <Form.Row>
                                <Col>
                                    <h4>Import Asserts</h4>
                                    <Table hover bordered variant="dark" size="sm">
                                        <thead>
                                            <tr>
                                                <th className="c-tc-icon1"></th>
                                                <th style={{width: "200px"}}>Alias</th>
                                                <th>Assert path</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {
                                            step.imports.map((imp) => {
                                                return (
                                                    <tr key={imp.alias}>
                                                        <td className="align-middle">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                disabled = {mode==='view'}
                                                                onClick={() => {this.deleteImport(imp.alias)}}
                                                            >
                                                                <Icon.X />
                                                            </Button>
                                                        </td>
                                                        <td className="align-middle">{imp.alias}</td>
                                                        <td className="align-middle">{imp.dsi_name}</td>
                                                    </tr>
                                                )
                                            })
                                        }
                                        {
                                            (mode === 'edit' || mode === 'new') &&
                                            <tr>
                                                <td className="align-middle">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        disabled = {
                                                            !step._toAddAlias.trim() ||
                                                            !step._toAddAssertPath.trim()
                                                        }
                                                        onClick={() => {
                                                            this.setState(state => {
                                                                state.payload.step.imports.push({
                                                                    alias   : step._toAddAlias.trim(),
                                                                    dsi_name: step._toAddAssertPath.trim(),
                                                                });
                                                                state.payload.step._toAddAlias = '';
                                                                state.payload.step._toAddAssertPath = '';
                                                                return state;
                                                            });
                                                        }}
                                                    >
                                                        <Icon.Plus />
                                                    </Button>
                                                </td>
                                                <td>
                                                    <Form.Control id="task_step_alias_to_add"
                                                        size="sm"
                                                        value={step._toAddAlias}
                                                        onChange={(event) => {
                                                            const v = event.target.value;
                                                            this.setState(state => {
                                                                state.payload.step._toAddAlias = v;
                                                                return state;
                                                            })
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Control id="task_step_dsi_name_to_add"
                                                        size="sm"
                                                        value={step._toAddAssertPath}
                                                        onChange={(event) => {
                                                            const v = event.target.value;
                                                            this.setState(state => {
                                                                state.payload.step._toAddAssertPath = v;
                                                                return state;
                                                            })
                                                        }}
                                                    />
                                                </td>
                                            </tr>

                                        }
                                        </tbody>
                                    </Table>
                                </Col>
                            </Form.Row>

                            <Form.Row>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-output-alias">
                                        <Form.Label column sm={4}>Output alias</Form.Label>
                                        <Col sm={8}>
                                            <Form.Control
                                                size="sm"
                                                disabled = {mode==='view'}
                                                value={step.alias}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.payload.step.alias = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group as={Row} controlId="save-to-file">
                                        <Form.Label column sm={4}>Write Output</Form.Label>
                                        <Col sm={8}>
                                            <Form.Check
                                                size="sm"
                                                className="c-vc"
                                                type="checkbox"
                                                disabled = {mode==="view"}
                                                checked={step._output}
                                                onChange={(event) => {
                                                    const v = event.target.checked;
                                                    this.setState(
                                                        state => {
                                                            state.payload.step._output = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Form.Row>
                            {
                                step._output &&
                                <Row>
                                    <Col>
                                        <fieldset className="border p-2">
                                            <legend  className="w-auto">Write Output</legend>
                                            <Row>
                                                <Col>
                                                    <Form.Group as={Row} controlId="sql-step-output-location">
                                                        <Form.Label column sm={3}>Location</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control
                                                                size="sm"
                                                                disabled = {mode==='view'}
                                                                value={step.output.location}
                                                                isInvalid={!this.isOutputLocationValid(step)}
                                                                onChange={(event) => {
                                                                    const v = event.target.value;
                                                                    this.setState(state => {
                                                                        state.payload.step.output.location = v;
                                                                        return state;
                                                                    });
                                                                }}
                                                            />
                                                            <Form.Control.Feedback tooltip type="invalid">
                                                                Cannot be empty.
                                                            </Form.Control.Feedback>
                                                        </Col>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group as={Row} controlId="sql-step-output-dataset-name">
                                                        <Form.Label column sm={3}>Asset Path</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control
                                                                size="sm"
                                                                disabled = {mode==='view'}
                                                                value={step.output.register_dataset_instance}
                                                                onChange={(event) => {
                                                                    const v = event.target.value;
                                                                    this.setState(state => {
                                                                        state.payload.step.output.register_dataset_instance = v;
                                                                        return state;
                                                                    });
                                                                }}
                                                            />
                                                        </Col>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col>
                                                    <Form.Group as={Row} controlId="sql-step-output-type">
                                                        <Form.Label column sm={3}>Type</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control
                                                                size="sm"
                                                                as="select"
                                                                disabled = {mode==='view'}
                                                                value={step.output.type}
                                                                onChange={(event) => {
                                                                    const v = event.target.value;
                                                                    this.setState(state => {
                                                                        state.payload.step.output.type = v;
                                                                        return state;
                                                                    });
                                                                }}
                                                            >
                                                                <option key="parquet" value="parquet">parquet</option>
                                                                <option key="json"    value="json">json</option>
                                                            </Form.Control>
                                                        </Col>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group as={Row} controlId="sql-step-output-write-mode">
                                                        <Form.Label column sm={3}>Write Mode</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control
                                                                size="sm"
                                                                as="select"
                                                                disabled = {mode==='view'}
                                                                value={step.output.write_mode}
                                                                onChange={(event) => {
                                                                    const v = event.target.value;
                                                                    this.setState(state => {
                                                                        state.payload.step.output.write_mode = v;
                                                                        return state;
                                                                    });
                                                                }}
                                                            >
                                                                <option key="overwrite" value="overwrite">overwrite</option>
                                                                <option key="append"    value="append">append</option>
                                                            </Form.Control>
                                                        </Col>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col></Col>
                                                <Col>
                                                    <Form.Group as={Row} controlId="sql-step-output-data-time">
                                                        <Form.Label column sm={3}>Data Time</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control
                                                                size="sm"
                                                                disabled = {mode==='view'}
                                                                value={step.output.data_time}
                                                                isInvalid={!this.isOutputDataTimeValid(step)}
                                                                onChange={(event) => {
                                                                    const v = event.target.value;
                                                                    this.setState(state => {
                                                                        state.payload.step.output.data_time = v;
                                                                        return state;
                                                                    });
                                                                }}
                                                            />
                                                            <Form.Control.Feedback tooltip type="invalid">
                                                                Cannot be empty.
                                                            </Form.Control.Feedback>
                                                        </Col>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </fieldset>
                                    </Col>
                                </Row>
                            }
                        </Container>
                    </Tab>
                    <Tab eventKey="SQLStmt" title="SQL Statement">
                        <Container fluid className="pt-2">
                            <Form.Row>
                                <Form.Group as={Col} controlId="sql-step-sql">
                                    <Form.Label>SQL Statement</Form.Label>
                                    <Form.Control as="textarea" rows="25"
                                        size="sm"
                                        className="monofont"
                                        disabled = {mode==='view'}
                                        value={step.sql}
                                        isInvalid={!this.isSQLValid(step)}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(state => {
                                                state.payload.step.sql = v;
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Control.Feedback tooltip type="invalid">
                                        Cannot be empty.
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Form.Row>
                        </Container>
                    </Tab>
                </Tabs>
            </div>
        );
    }
}
