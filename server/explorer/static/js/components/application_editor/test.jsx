import React from 'react'

import Button from 'react-bootstrap/Button'

import {ApplicationEditor} from './application_editor.jsx'

export class TestApplicationEditor extends React.Component {
    testApplicationEditorRef = React.createRef();

    onSaveApplication = (mode, application) => {
        console.log(`Test Application is saved as ${mode}`);
        console.log(application);
    };

    onCancelApplication = () => {
        console.log("Test Application is not saved");
    };

    render() {
        return (
            <div>
                <h2>Test ApplicationEditor</h2>
                <ApplicationEditor
                    ref={this.testApplicationEditorRef}
                    onSave={this.onSaveApplication}
                    onCancel={this.onCancelApplication}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testApplicationEditorRef.current.openDialog();
                    }}
                >
                    New Application
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testApplicationEditorRef.current.openDialog({
                            name: "test data",
                            description: "Blah...",
                            team: "trading",
                            retired: false,
                            app_location: ''
                        });
                    }}
                >
                    Edit Application
                </Button>
            </div>
        );
    }
}
