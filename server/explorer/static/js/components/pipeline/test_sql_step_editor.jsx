import React from 'react'

import Button from 'react-bootstrap/Button'

import {SQLStepEditor} from './sql_step_editor.jsx'

export class TestSQLStepEditor extends React.Component {
    testSQLEditorRef = React.createRef();

    onSaveSQLEditor = (mode, step) => {
        console.log(`Test SQL Step is saved with mode ${mode}`);
        console.log(step);
    };

    render() {
        return (
            <div>
                <h2>Test SQLSetepEditor</h2>
                <SQLStepEditor
                    ref={this.testSQLEditorRef}
                    onSave={this.onSaveSQLEditor}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testSQLEditorRef.current.openDialog('new');
                    }}
                >
                    New Step
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testSQLEditorRef.current.openDialog('edit', {
                            name: 'foo',
                            imports: [{alias: "X", dsi_name: "trading:1.0:1/{{dt}}"}],
                            sql: "SELECT * FROM X",
                            alias: '',
                            output: {
                                type: 'parquet',
                                write_mode: 'overwrite',
                                location: '',
                                register_dataset_instance: ''
                            }
                        });
                    }}
                >
                    Edit Step
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testSQLEditorRef.current.openDialog('view', {
                            name: 'foo',
                            imports: [{alias: "X", dsi_name: "trading:1.0:1/{{dt}}"}],
                            sql: "SELECT * FROM X",
                            alias: '',
                            output: {
                                type: 'parquet',
                                write_mode: 'overwrite',
                                location: '',
                                register_dataset_instance: ''
                            }
                        });
                    }}
                >
                    View Step
                </Button>
            </div>
        );
    }
}
