// **********************************************************************
//
// Copyright (c) 2003-2017 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

#include <SessionFactoryI.h>

using namespace std;
using namespace Demo;

class SessionServer : public Ice::Application
{
public:

    virtual int run(int, char*[]);
};


int
#ifdef _WIN32
wmain(int argc, wchar_t* argv[])
#else
main(int argc, char* argv[])
#endif
{
#ifdef ICE_STATIC_LIBS
    Ice::registerIceSSL();
#endif
    SessionServer app;
    return app.main(argc, argv, "config.server");
}

int
SessionServer::run(int argc, char*[])
{
    if(argc > 1)
    {
        cerr << appName() << ": too many arguments" << endl;
        return EXIT_FAILURE;
    }

    Ice::ObjectAdapterPtr adapter = communicator()->createObjectAdapter("SessionFactory");

    IceUtil::TimerPtr timer = new IceUtil::Timer();
    ReapTaskPtr reapTask = new ReapTask;
    timer->scheduleRepeated(reapTask, IceUtil::Time::seconds(1));

    SessionFactoryPtr factory = new SessionFactoryI(reapTask);
    adapter->add(factory, Ice::stringToIdentity("SessionFactory"));
    adapter->activate();
    communicator()->waitForShutdown();

    timer->destroy();

    return EXIT_SUCCESS;
}
