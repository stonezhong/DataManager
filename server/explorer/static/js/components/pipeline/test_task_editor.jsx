import React from 'react'

import Button from 'react-bootstrap/Button'

import {SequentialTaskEditor} from './task_editor.jsx'

export class TestTaskEditor extends React.Component {
    testTaskEditorRef = React.createRef();

    onSaveTask = (task) => {
        console.log("Test Task is saved");
        console.log(task);
    };

    onCancelTask = () => {
        console.log("Test Task is not saved");
    };

    render() {
        return (
            <div>
                <h2>Test SequentialTaskEditor</h2>
                <SequentialTaskEditor
                    ref={this.testTaskEditorRef}
                    onSave={this.onSaveTask}
                    onCancel={this.onCancelTask}
                    applications={[
                        {'id': 'a', 'name': 'foo'},
                        {'id': 'b', 'name': 'bar'},

                    ]}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testTaskEditorRef.current.openDialog();
                    }}
                >
                    New Task
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testTaskEditorRef.current.openDialog({
                            name: 'foo',
                            description: 'blah...',
                            type: 'spark-sql',
                            appLocation: '',
                            args: {},
                            steps: [
                                {
                                    name: 'step 1',
                                    imports: [{alias: "X", dsi_name: "trading:1.0:1/{{dt}}"}],
                                    sql: "SELECT * FROM X",
                                    alias: '',
                                    output: {
                                        type: 'parquet',
                                        write_mode: 'overwrite',
                                        location: '',
                                        register_dataset_instance: ''
                                    }

                                }
                            ]
                        });
                    }}
                >
                    Edit Task
                </Button>
            </div>
        );
    }
}
